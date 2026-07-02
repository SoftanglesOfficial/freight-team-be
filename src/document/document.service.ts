import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Document, DocumentCategory } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { Shipment } from 'src/shipment/entities/shipment.entity';
import { RequestContextService } from 'src/request-context/request-context.service';
import { Role } from 'src/roles/roles.decorator';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentUploadedAction } from './actions/document-uploaded.action';

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<Document>,
    @InjectModel(Shipment.name) private shipmentModel: Model<any>,
    private readonly requestContext: RequestContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    try {
      // Validate that only one association is provided (shipment or quote request)
      if (createDocumentDto.shipment_id && createDocumentDto.quote_request_id) {
        throw new BadRequestException(
          'Document can only be associated with either a shipment or a quote request, not both',
        );
      }

      // Generate unique internal_id
      const internal_id = await this.generateUniqueInternalId();

      let customerId = createDocumentDto.customer_id;

      let fallbackEmail: string | null = null;
      let fallbackName: string | null = null;

      // Automated assignment: If customer_id is missing but shipment_id is present,
      // inherit the customer from the shipment.
      if (!customerId && createDocumentDto.shipment_id) {
        const shipment = await this.shipmentModel.findById(
          createDocumentDto.shipment_id,
        );
        if (shipment) {
          if (shipment.customer_id) {
            customerId = shipment.customer_id.toString();
          }
          // Store fallback contact info for emails when no User account exists
          fallbackEmail =
            shipment.customer?.email ||
            shipment.email ||
            shipment.customer_email ||
            null;
          fallbackName =
            shipment.customer?.name ||
            shipment.full_name ||
            shipment.customer_name ||
            null;
        }
      }

      // Convert string IDs to ObjectIds if provided
      const documentData = {
        ...createDocumentDto,
        internal_id,
        shipment_id: createDocumentDto.shipment_id
          ? new Types.ObjectId(createDocumentDto.shipment_id)
          : undefined,
        quote_request_id: createDocumentDto.quote_request_id
          ? new Types.ObjectId(createDocumentDto.quote_request_id)
          : undefined,
        customer: customerId ? new Types.ObjectId(customerId) : undefined,
        fallback_email: fallbackEmail,
        fallback_name: fallbackName,
      };

      const document = new this.documentModel(documentData);
      const savedDocument = await document.save();

      // Email when already linked to a shipment (edit flow). Create-shipment flow
      // uploads BOL first, then links on save — emails fire from shipment.service.
      if (createDocumentDto.shipment_id) {
        try {
          await this.emitUploadEmailsForDocuments([savedDocument._id]);
        } catch (error) {
          console.error('Failed to emit DocumentUploadedAction:', error.message);
        }
      }

      return savedDocument;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create document: ${error.message}`);
    }
  }

  async findAll(query: DocumentQueryDto): Promise<[Document[], number]> {
    const {
      search,
      type,
      shipment_id,
      quote_request_id,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
    } = query;

    // const skip = (page - 1) * limit;

    // Build filter object
    const filter: FilterQuery<Document> = {
      category: category,
    };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (type) {
      filter.type = type;
    }

    if (shipment_id) {
      filter.shipment_id = new Types.ObjectId(shipment_id);
    }

    if (quote_request_id) {
      filter.quote_request_id = new Types.ObjectId(quote_request_id);
    }

    if (query.customer_id) {
      filter.customer = new Types.ObjectId(query.customer_id);
    }

    // Data Isolation: If not an admin, restrict to own documents
    const user = this.requestContext.getUser();
    const isAdmin = user.roles?.some(
      (role) =>
        role.toLowerCase().includes('admin') ||
        role.toLowerCase() === 'admin' ||
        role.toLowerCase() === 'super admin',
    );

    if (!isAdmin) {
      // Find all shipment IDs belonging to this user (by ID or Email)
      const userShipments = await this.shipmentModel.find({
        $or: [
          { customer_id: new Types.ObjectId(user.sub) },
          { 'customer.email': { $regex: `^${user.email}$`, $options: 'i' } },
        ]
      }).select('_id').exec();
      const shipmentIds = userShipments.map(s => s._id);

      // Filter documents that either belong directly to the customer OR to one of their shipments
      filter.$or = [
        { customer: new Types.ObjectId(user.sub) },
        { shipment_id: { $in: shipmentIds } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    return await Promise.all([
      this.documentModel
        .find(filter)
        .sort(sort)
        .skip(query.skip)
        .limit(query.pageSize)
        .populate('shipment_id', 'proNumber')
        .populate('quote_request_id', 'tracking_id full_name')
        .populate('customer', 'first_name last_name email'),
      this.documentModel.countDocuments(filter),
    ]);

    // const totalPages = Math.ceil(total / limit);

    // // Transform documents to match DTO structure
    // const transformedDocuments = documents.map((doc) => ({
    //   _id: doc._id.toString(),
    //   name: doc.name,
    //   size: doc.size,
    //   type: doc.type,
    //   internal_id: doc.internal_id,
    //   url: doc.url,
    //   file_id: doc.file_id,
    //   shipment_id: doc.shipment_id?._id?.toString() || doc.shipment_id?.toString(),
    //   quote_request_id: doc.quote_request_id?._id?.toString() || doc.quote_request_id?.toString(),
    //   createdAt: doc.createdAt,
    //   updatedAt: doc.updatedAt,
    // }));
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentModel
      .findById(id)
      .populate('shipment_id', 'proNumber')
      .populate('quote_request_id', 'tracking_id full_name')
      .populate('customer', 'first_name last_name email')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    try {
      // Validate that only one association is provided (shipment or quote request)
      if (updateDocumentDto.shipment_id && updateDocumentDto.quote_request_id) {
        throw new BadRequestException(
          'Document can only be associated with either a shipment or a quote request, not both',
        );
      }

      // Check if internal_id is being updated and if it already exists
      if (updateDocumentDto.internal_id) {
        const existingDocument = await this.documentModel.findOne({
          internal_id: updateDocumentDto.internal_id,
          _id: { $ne: new Types.ObjectId(id) },
        });

        if (existingDocument) {
          throw new BadRequestException(
            `Document with internal ID ${updateDocumentDto.internal_id} already exists`,
          );
        }
      }

      // Convert string IDs to ObjectIds if provided
      const updateData = {
        ...updateDocumentDto,
        shipment_id: updateDocumentDto.shipment_id
          ? new Types.ObjectId(updateDocumentDto.shipment_id)
          : undefined,
        quote_request_id: updateDocumentDto.quote_request_id
          ? new Types.ObjectId(updateDocumentDto.quote_request_id)
          : undefined,
        customer: updateDocumentDto.customer_id
          ? new Types.ObjectId(updateDocumentDto.customer_id)
          : undefined,
      };

      const document = await this.documentModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate('shipment_id', 'proNumber')
        .populate('quote_request_id', 'tracking_id full_name')
        .populate('customer', 'first_name last_name email')
        .exec();

      if (!document) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }

      return document;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update document: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    const document = await this.documentModel.findByIdAndDelete(id).exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
  }

  async findByShipmentId(shipmentId: string): Promise<Document[]> {
    return this.documentModel
      .find({ shipment_id: new Types.ObjectId(shipmentId) })
      .populate('shipment_id', 'proNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByQuoteRequestId(quoteRequestId: string): Promise<Document[]> {
    return this.documentModel
      .find({ quote_request_id: new Types.ObjectId(quoteRequestId) })
      .populate('quote_request_id', 'tracking_id full_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async sendBolEmail(documentId: string): Promise<{ message: string }> {
    const document = await this.documentModel
      .findById(documentId)
      .populate('shipment_id')
      .populate('customer')
      .exec();

    if (!document) throw new NotFoundException(`Document not found`);
    if (document.category !== DocumentCategory.BOL) {
      throw new BadRequestException('This document is not a BOL');
    }

    await this.emitUploadEmailsForDocuments([document._id]);

    return { message: 'BOL email sent successfully' };
  }

  async parseBolPdf(file: Express.Multer.File): Promise<any> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      const text = data.text;

      if (!text || text.trim().length < 50) {
        return {
          success: false,
          data: {},
          error: 'Could not extract text from PDF. It may be a scanned image.',
        };
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `Extract the following fields from this Bill of Lading text and return ONLY a valid JSON object with no explanation, no markdown, no backticks:

{
  "shipper_business_name": "",
  "shipper_address": "",
  "shipper_city": "",
  "shipper_state": "",
  "shipper_zip": "",
  "consignee_business_name": "",
  "consignee_address": "",
  "consignee_city": "",
  "consignee_state": "",
  "consignee_zip": "",
  "pro_number": "",
  "bol_number": "",
  "carrier_name": "",
  "carrier_quote_id": "",
  "pieces": "",
  "weight": "",
  "freight_class": "",
  "pallet_length": "",
  "pallet_width": "",
  "pallet_height": "",
  "commodity": "",
  "pickup_date": "",
  "destination_accessorials": "",
  "stackable": "",
  "special_instructions": ""
}

Rules:
- shipper = pickup location (where freight is collected FROM)
- consignee = delivery location (where freight is going TO)  
- If a field is not found, leave it as empty string
- For weight, return numbers only, no units (e.g. "550" not "550 lbs")
- For dimensions, return numbers only, no units (e.g. "48" not "48in")
- For dates, return MM/DD/YYYY format
- Do not guess or invent values

BOL TEXT:
${text}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error: ${err}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return { success: true, data: parsed };
    } catch (error) {
      console.error('BOL parse error:', error.message);
      return { success: false, data: {}, error: error.message };
    }
  }

  async emitUploadEmailsForDocuments(
    documentIds: (string | Types.ObjectId)[],
  ): Promise<void> {
    const ids = documentIds
      .filter((id) => id && Types.ObjectId.isValid(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));

    if (ids.length === 0) return;

    let actor;
    try {
      actor = this.requestContext.getUser();
    } catch {
      actor = await this.requestContext.getSystemUser();
    }

    const documents = await this.documentModel
      .find({
        _id: { $in: ids },
        category: { $in: [DocumentCategory.BOL, DocumentCategory.INVOICE] },
      })
      .populate('shipment_id')
      .populate('customer')
      .exec();

    for (const document of documents) {
      try {
        await this.eventEmitter.emitAsync(
          'action',
          new DocumentUploadedAction(actor, document),
        );
      } catch (error) {
        console.error('Failed to emit DocumentUploadedAction:', error.message);
      }
    }
  }

  private async generateUniqueInternalId(): Promise<string> {
    let internalId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate a random 7-digit number
      const randomNum = Math.floor(Math.random() * 9000000) + 1000000;
      internalId = `sh-${randomNum.toString().padStart(7, '0')}`;

      // Check if this ID already exists
      const existingDocument = await this.documentModel.findOne({ internal_id: internalId });

      if (!existingDocument) {
        return internalId;
      }

      attempts++;
    } while (attempts < maxAttempts);

    // If we can't generate a unique ID after max attempts, throw an error
    throw new BadRequestException('Failed to generate unique internal ID after multiple attempts');
  }
}
