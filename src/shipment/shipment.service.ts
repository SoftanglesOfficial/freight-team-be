import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Shipment } from './entities/shipment.entity';
import { Document as DocumentEntity } from '../document/entities/document.entity';
import { FilterQuery, Model, Types } from 'mongoose';
import { TrackingResponseDto } from './dto/tracking-response.dto';
import { QuoteRequest } from 'src/quote-request/entities/quote-request.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentCreatedAction } from './actions/shipment-created.action';
import { ShipmentStatusUpdatedAction } from './actions/shipment-status-updated.action';
import { ShipmentLocationUpdatedAction } from './actions/shipment-location-updated.action';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { UserService } from 'src/user/user.service';
import { RequestContextService } from 'src/request-context/request-context.service';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import { DocumentService } from 'src/document/document.service';

@Injectable()
export class ShipmentService {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentEntity>,
    @InjectModel(QuoteRequest.name) private quoteRequestModel: Model<QuoteRequest>,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
    private readonly userService: UserService,
    private readonly documentService: DocumentService,
  ) {}

  private async generateProNumber(): Promise<string> {
    const lastShipment = await this.shipmentModel
      .find({ proNumber: { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec();

    let number = 0;
    if (lastShipment.length > 0 && lastShipment[0].proNumber) {
      const lastNumber = parseInt(lastShipment[0].proNumber.split('-')[1]);
      if (!isNaN(lastNumber)) {
        number = lastNumber;
      }
    }
    number++;
    return `RT-${number.toString().padStart(7, '0')}`;
  }

  private parseName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }
    const last_name = parts.pop();
    const first_name = parts.join(' ');
    return { first_name, last_name };
  }

  async create(createShipmentDto: CreateShipmentDto): Promise<Shipment> {
    const proNumber = await this.generateProNumber();

    let customerId: Types.ObjectId | undefined = createShipmentDto.customer_id
      ? new Types.ObjectId(createShipmentDto.customer_id)
      : undefined;

    // Automated Customer Lifecycle: Try to find or create customer by email
    const customerEmail = createShipmentDto.customer?.email;
    if (!customerId && customerEmail) {
      const existingUser = await this.userService.findByEmailOrDefault(customerEmail);
      if (existingUser) {
        customerId = existingUser._id as Types.ObjectId;
      } else {
        // Create new customer
        const { first_name, last_name } = this.parseName(createShipmentDto.customer.name);
        const newCustomer = await this.userService.createCustomer({
          first_name,
          last_name,
          email: customerEmail,
          phone: createShipmentDto.customer.phone,
          company_name: createShipmentDto.customer.company_name,
        });
        customerId = newCustomer._id as Types.ObjectId;
      }
    }

    const shipment = await this.shipmentModel.create({
      ...createShipmentDto,
      proNumber,
      customer_id: customerId,
      dateOfOrder: new Date(createShipmentDto.dateOfOrder),
      ...(createShipmentDto.pickupDate && {
        pickupDate: new Date(createShipmentDto.pickupDate),
      }),
      estimatedDeliveryDate: new Date(createShipmentDto.estimatedDeliveryDate),
      ...(createShipmentDto.deliveryDate && {
        deliveryDate: new Date(createShipmentDto.deliveryDate),
      }),
      ...(createShipmentDto.quoteId && {
        quote: new Types.ObjectId(createShipmentDto.quoteId),
      }),
      status_history: [
        {
          status: 'pending',
          timestamp: new Date(),
          updatedBy: this.requestContext.getUser()?.email || 'System',
          note: 'Shipment created',
        },
      ],
    });

    // Emit shipment created event
    try {
      const user = this.requestContext.getUser();
      await this.eventEmitter.emitAsync('action', new ShipmentCreatedAction(user, shipment));
    } catch (error) {
      // If no user context (system operation), use system user
      const systemUser = await this.requestContext.getSystemUser();
      await this.eventEmitter.emitAsync('action', new ShipmentCreatedAction(systemUser, shipment));
    }

    // Link documents to this shipment and customer
    if (createShipmentDto.documents && createShipmentDto.documents.length > 0) {
      const validDocIds = createShipmentDto.documents
        .filter((id) => id && Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (validDocIds.length > 0) {
        const updateData: any = { shipment_id: shipment._id };
        if (customerId) {
          updateData.customer = customerId;
        }

        await this.documentModel.updateMany({ _id: { $in: validDocIds } }, { $set: updateData });
        await this.documentService.emitUploadEmailsForDocuments(validDocIds);
      }
    }

    return shipment;
  }

  async findAll(query: ShipmentQueryDto): Promise<[Shipment[], number]> {
    const filter: FilterQuery<Shipment> = {};

    if (query.status) {
      if (query.status.includes(',')) {
        filter.status = { $in: query.status.split(',') };
      } else {
        filter.status = query.status;
      }
    }

    if (query.proNumber) {
      filter.proNumber = { $regex: query.proNumber, $options: 'i' };
    }

    if (query.carrierName) {
      filter.carrierName = { $regex: query.carrierName, $options: 'i' };
    }

    if (query.customer_name) {
      filter['customer.name'] = { $regex: query.customer_name, $options: 'i' };
    }

    if (query.customer_email) {
      filter['customer.email'] = query.customer_email;
    }

    if (query.customer_id) {
      filter['customer_id'] = new Types.ObjectId(query.customer_id);
    }

    if (query.dateOfOrder_from || query.dateOfOrder_to) {
      filter.dateOfOrder = {};
      if (query.dateOfOrder_from) {
        filter.dateOfOrder.$gte = new Date(query.dateOfOrder_from);
      }
      if (query.dateOfOrder_to) {
        filter.dateOfOrder.$lte = new Date(query.dateOfOrder_to);
      }
    }

    if (query.pickupDate_from || query.pickupDate_to) {
      filter.pickupDate = {};
      if (query.pickupDate_from) {
        filter.pickupDate.$gte = new Date(query.pickupDate_from);
      }
      if (query.pickupDate_to) {
        filter.pickupDate.$lte = new Date(query.pickupDate_to);
      }
    }

    if (query.estimatedDeliveryDate_from || query.estimatedDeliveryDate_to) {
      filter.estimatedDeliveryDate = {};
      if (query.estimatedDeliveryDate_from) {
        filter.estimatedDeliveryDate.$gte = new Date(query.estimatedDeliveryDate_from);
      }
      if (query.estimatedDeliveryDate_to) {
        filter.estimatedDeliveryDate.$lte = new Date(query.estimatedDeliveryDate_to);
      }
    }

    if (query.deliveryDate_from || query.deliveryDate_to) {
      filter.deliveryDate = {};
      if (query.deliveryDate_from) {
        filter.deliveryDate.$gte = new Date(query.deliveryDate_from);
      }
      if (query.deliveryDate_to) {
        filter.deliveryDate.$lte = new Date(query.deliveryDate_to);
      }
    }

    const user = this.requestContext.getUser();
    const isAdmin = user.roles?.some(
      (role) =>
        role.toLowerCase().includes('admin') ||
        role.toLowerCase() === 'admin' ||
        role.toLowerCase() === 'super admin',
    );

    if (!isAdmin) {
      // Data Isolation: Customers can see shipments matched by their customer_id OR their email (case-insensitive)
      // This ensures they see shipments even if they weren't explicitly linked to their User ID yet.
      filter.$or = [
        { customer_id: new Types.ObjectId(user.sub) },
        { 'customer.email': { $regex: `^${user.email}$`, $options: 'i' } },
      ];
    }

    if (query.quoteId) {
      filter.quote = new Types.ObjectId(query.quoteId);
    }

    const shipments = await this.shipmentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.pageSize)
      .populate('quote')
      .exec();

    const count = await this.shipmentModel.countDocuments(filter).exec();
    return [shipments, count];
  }

  async findOne(id: string): Promise<Shipment> {
    return this.shipmentModel
      .findById(id)
      .populate('quote')
      .populate('customer_id', 'first_name last_name email')
      .orFail(new NotFoundException('Shipment not found'));
  }

  async isShipmentVisibleToUser(
    shipmentId: string,
    userSub: string,
    userEmail: string,
  ): Promise<boolean> {
    const shipment = await this.shipmentModel.findOne({
      _id: new Types.ObjectId(shipmentId),
      $or: [
        { customer_id: new Types.ObjectId(userSub) },
        { 'customer.email': { $regex: `^${userEmail}$`, $options: 'i' } },
      ],
    });
    return !!shipment;
  }

  async findByProNumber(proNumber: string): Promise<Shipment> {
    return this.shipmentModel
      .findOne({ proNumber })
      .populate('quote')
      .orFail(new NotFoundException('Shipment not found'));
  }

  async findByFtlId(ftlID: string): Promise<Shipment> {
    // Legacy fallback — searches both proNumber and the old ftlID field
    return this.shipmentModel
      .findOne({ $or: [{ proNumber: ftlID }, { proNumber: ftlID }] })
      .populate('quote')
      .orFail(new NotFoundException('Shipment not found'));
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto): Promise<Shipment> {
    // Get the old shipment to compare status
    const oldShipment = await this.findOne(id);
    const oldStatus = oldShipment.status;

    const updateData: any = { ...updateShipmentDto };

    if (updateShipmentDto.dateOfOrder) {
      updateData.dateOfOrder = new Date(updateShipmentDto.dateOfOrder);
    }

    if (updateShipmentDto.pickupDate) {
      updateData.pickupDate = new Date(updateShipmentDto.pickupDate);
    }

    if (updateShipmentDto.estimatedDeliveryDate) {
      updateData.estimatedDeliveryDate = new Date(updateShipmentDto.estimatedDeliveryDate);
    }

    if (updateShipmentDto.deliveryDate) {
      updateData.deliveryDate = new Date(updateShipmentDto.deliveryDate);
    }

    if (updateShipmentDto.quoteId !== undefined) {
      updateData.quote = updateShipmentDto.quoteId
        ? new Types.ObjectId(updateShipmentDto.quoteId)
        : null;
    }

    const updatedShipment = await this.shipmentModel
      .findByIdAndUpdate(
        id,
        {
          $set: updateData,
          ...(updateShipmentDto.status &&
            updateShipmentDto.status !== oldStatus && {
              $push: {
                status_history: {
                  status: updateShipmentDto.status,
                  timestamp: new Date(),
                  updatedBy: this.requestContext.getUser()?.email || 'System',
                  note: `Status updated from ${oldStatus} to ${updateShipmentDto.status}`,
                },
              },
            }),
        },
        { new: true },
      )
      .populate('quote')
      .populate('customer_id', 'first_name last_name email')
      .orFail(new NotFoundException('Shipment not found'));

    // Emit status updated event if status changed
    if (updateShipmentDto.status !== undefined && updateShipmentDto.status !== oldStatus) {
      try {
        const user = this.requestContext.getUser();
        await this.eventEmitter.emitAsync(
          'action',
          new ShipmentStatusUpdatedAction(user, updatedShipment, { oldStatus }),
        );
      } catch (error) {
        const systemUser = await this.requestContext.getSystemUser();
        await this.eventEmitter.emitAsync(
          'action',
          new ShipmentStatusUpdatedAction(systemUser, updatedShipment, { oldStatus }),
        );
      }
    }

    // Ensure all associated documents are linked to this shipment and customer
    if (updateShipmentDto.documents && updateShipmentDto.documents.length > 0) {
      const validDocIds = updateShipmentDto.documents
        .filter((id) => id && Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (validDocIds.length > 0) {
        const updateDocData: any = { shipment_id: updatedShipment._id };
        if (updatedShipment.customer_id) {
          updateDocData.customer = updatedShipment.customer_id;
        }

        await this.documentModel.updateMany({ _id: { $in: validDocIds } }, { $set: updateDocData });
      }
    }

    return updatedShipment;
  }

  async remove(id: string): Promise<Shipment> {
    return this.shipmentModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException('Shipment not found'));
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingResponseDto> {
    let shipment: Shipment | null = null;

    // Try to find by proNumber first
    try {
      shipment = await this.findByProNumber(trackingNumber);
    } catch (error) {
      // If not found by proNumber, try ftlID
      try {
        shipment = await this.findByFtlId(trackingNumber);
      } catch (error) {
        // If still not found, try to find by document internal_id (invoice number)
        try {
          const document = await this.documentModel.findOne({ internal_id: trackingNumber }).exec();

          if (document && document.shipment_id) {
            shipment = await this.findOne(document.shipment_id.toString());
          }
        } catch (error) {
          // Document not found or not associated with shipment
          shipment = null;
        }
      }
    }

    if (shipment) {
      return {
        shipment,
        quote: null,
      };
    }

    // If no shipment found, search for a Quote Request
    const quote = await this.quoteRequestModel
      .findOne({ tracking_id: trackingNumber })
      .populate('documents')
      .exec();

    if (quote) {
      return {
        shipment: null,
        quote,
      };
    }

    throw new NotFoundException(
      'No shipment or quote found. Please check your tracking number and try again.',
    );
  }

  async updateLocation(
    id: string,
    latitude: number,
    longitude: number,
    note?: string,
  ): Promise<Shipment> {
    const shipment = await this.findOne(id);

    shipment.current_location = {
      latitude,
      longitude,
      updatedAt: new Date(),
    };

    const updatedShipment = await this.shipmentModel
      .findByIdAndUpdate(
        id,
        {
          current_location: shipment.current_location,
          $push: {
            status_history: {
              status: shipment.status || 'in-transit',
              timestamp: new Date(),
              updatedBy: this.requestContext.getUser()?.email || 'System',
              note: note || 'Location updated',
              location: {
                latitude,
                longitude,
              },
            },
          },
        },
        { new: true },
      )
      .populate('quote')
      .populate('customer_id', 'first_name last_name email')
      .orFail(new NotFoundException('Shipment not found'));

    // Emit location updated event
    try {
      const user = this.requestContext.getUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentLocationUpdatedAction(user, updatedShipment),
      );
    } catch (error) {
      const systemUser = await this.requestContext.getSystemUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentLocationUpdatedAction(systemUser, updatedShipment),
      );
    }

    return updatedShipment;
  }

  async addNote(id: string, note: string): Promise<Shipment> {
    const shipment = await this.findOne(id);

    const updatedShipment = await this.shipmentModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            status_history: {
              status: shipment.status || 'pending',
              timestamp: new Date(),
              updatedBy: this.requestContext.getUser()?.email || 'System',
              note: note,
            },
          },
        },
        { new: true },
      )
      .populate('quote')
      .populate('customer_id', 'first_name last_name email')
      .orFail(new NotFoundException('Shipment not found'));

    try {
      const user = this.requestContext.getUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentLocationUpdatedAction(user, updatedShipment),
      );
    } catch (error) {
      const systemUser = await this.requestContext.getSystemUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentLocationUpdatedAction(systemUser, updatedShipment),
      );
    }

    return updatedShipment;
  }

  async sendStatusEmail(id: string, status: string): Promise<{ message: string }> {
    const shipment = await this.findOne(id);
    const user = this.requestContext.getUser();

    const fakeUpdated = {
      ...(shipment.toObject ? shipment.toObject() : shipment),
      status,
    } as Shipment;

    await this.eventEmitter.emitAsync(
      'action',
      new ShipmentStatusUpdatedAction(user, fakeUpdated, { oldStatus: 'manual-trigger' }),
    );

    return { message: `Status email for "${status}" sent to customer.` };
  }
}
