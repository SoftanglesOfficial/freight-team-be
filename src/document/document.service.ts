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

      // Automated assignment: If customer_id is missing but shipment_id is present,
      // inherit the customer from the shipment.
      if (!customerId && createDocumentDto.shipment_id) {
        const shipment = await this.shipmentModel.findById(createDocumentDto.shipment_id);
        if (shipment && shipment.customer_id) {
          customerId = shipment.customer_id.toString();
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
        customer: customerId
          ? new Types.ObjectId(customerId)
          : undefined,
      };

      const document = new this.documentModel(documentData);
      const savedDocument = await document.save();

      // Emit action event (async)
      try {
        const populatedDocument = await this.documentModel
          .findById(savedDocument._id)
          .populate('shipment_id')
          .populate('customer')
          .exec();

        if (populatedDocument) {
          await this.eventEmitter.emitAsync(
            'action',
            new DocumentUploadedAction(this.requestContext.getUser(), populatedDocument),
          );
        }
      } catch (error) {
        console.error('Failed to emit DocumentUploadedAction:', error.message);
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

    await this.eventEmitter.emitAsync(
      'action',
      new DocumentUploadedAction(this.requestContext.getUser(), document),
    );

    return { message: 'BOL email sent successfully' };
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
