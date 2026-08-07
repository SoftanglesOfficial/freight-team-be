import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Shipment, ShipmentNote } from './entities/shipment.entity';
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
import { resolveShipmentCustomerContact } from 'src/common/utils/resolve-customer-contact.util';
import { Role } from 'src/roles/roles.decorator';

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

  private normalizeNotes(notes: unknown): ShipmentNote[] {
    if (Array.isArray(notes)) {
      return notes as ShipmentNote[];
    }
    if (typeof notes === 'string' && notes.trim()) {
      return [
        {
          text: notes,
          internal: false,
          createdAt: new Date(),
        },
      ];
    }
    return [];
  }

  private applyNotesToShipment(shipment: Shipment, filterInternal = false): Shipment {
    let notes = this.normalizeNotes((shipment as any).notes);
    if (filterInternal) {
      notes = notes.filter((n) => !n.internal);
    }
    (shipment as any).notes = notes;
    return shipment;
  }

  private async generateProNumber(): Promise<string> {
    const prefix = 'RT';
    const lastShipment = await this.shipmentModel
      .find({ proNumber: { $exists: true, $regex: `^${prefix}-` } })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec();

    let number = 0;
    if (lastShipment.length > 0 && lastShipment[0].proNumber) {
      const parts = lastShipment[0].proNumber.split('-');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) {
        number = parsed;
      }
    }
    number++;
    return `${prefix}-${number.toString().padStart(7, '0')}`;
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

    let createdBy = 'System';
    try {
      const actor = this.requestContext.getUser();
      createdBy = `${actor.first_name} ${actor.last_name || ''}`.trim() || actor.email;
    } catch {
      // no request user
    }

    const { notes: legacyNotes, ...restCreate } = createShipmentDto;
    const initialNotes: ShipmentNote[] = legacyNotes
      ? [
          {
            text: legacyNotes,
            internal: false,
            createdAt: new Date(),
            createdBy,
          },
        ]
      : [];

    const initialStatus =
      createShipmentDto.status ||
      (createShipmentDto.pickupDate ? 'in-transit' : 'pending');

    const shipment = await this.shipmentModel.create({
      ...restCreate,
      notes: initialNotes,
      proNumber,
      customer_id: customerId,
      status: initialStatus,
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
          status: 'created',
          note: 'Shipment created',
          timestamp: new Date(),
          updatedBy: this.requestContext.getUser()?.email || 'System',
          internal: false,
        },
      ],
    });

    // Emit shipment created event
    const adminIds = await this.userService.findAllAdminIds();
    try {
      const user = this.requestContext.getUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentCreatedAction(user, shipment, { adminIds }),
      );
    } catch (error) {
      // If no user context (system operation), use system user
      const systemUser = await this.requestContext.getSystemUser();
      await this.eventEmitter.emitAsync(
        'action',
        new ShipmentCreatedAction(systemUser, shipment, { adminIds }),
      );
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

        // BOL docs uploaded before shipment existed — record history now
        const bolDocs = await this.documentModel.find({
          _id: { $in: validDocIds },
          category: 'BOL',
        });
        for (const bol of bolDocs) {
          await this.shipmentModel.updateOne(
            { _id: shipment._id },
            {
              $push: {
                status_history: {
                  status: 'bol-uploaded',
                  note: `BOL document uploaded: ${bol.name}`,
                  timestamp: new Date(),
                  internal: false,
                },
              },
            },
          );
        }

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

    if (query.poNumber) {
      filter.poNumber = { $regex: query.poNumber, $options: 'i' };
    }

    if (query.ftlWareHouseId) {
      filter.ftlWareHouseId = { $regex: query.ftlWareHouseId, $options: 'i' };
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
      .sort({ ftlWareHouseId: -1, createdAt: -1 })
      .skip(query.skip)
      .limit(query.pageSize)
      .populate('quote')
      .exec();

    const count = await this.shipmentModel.countDocuments(filter).exec();
    const filterInternal = !isAdmin;
    return [shipments.map((s) => this.applyNotesToShipment(s, filterInternal)), count];
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.shipmentModel
      .findById(id)
      .populate('quote')
      .populate('customer_id', 'first_name last_name email')
      .orFail(new NotFoundException('Shipment not found'));

    const rawNotes = (shipment as any).notes;
    const normalized = this.normalizeNotes(rawNotes);

    // Migrate legacy string notes to array on read
    if (typeof rawNotes === 'string') {
      await this.shipmentModel.updateOne({ _id: shipment._id }, { $set: { notes: normalized } });
    }

    let filterInternal = false;
    try {
      const user = this.requestContext.getUser();
      const isAdmin = user.roles?.some(
        (role) =>
          role.toLowerCase().includes('admin') ||
          role.toLowerCase() === 'admin' ||
          role.toLowerCase() === 'super admin' ||
          role === Role.SUPER_ADMIN,
      );
      filterInternal = !isAdmin;
    } catch {
      filterInternal = true;
    }

    return this.applyNotesToShipment(shipment, filterInternal);
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

    // Add structured note (internal or customer-visible)
    if (updateShipmentDto.newNote?.text?.trim()) {
      let createdBy = 'System';
      try {
        const actor = this.requestContext.getUser();
        createdBy = `${actor.first_name} ${actor.last_name || ''}`.trim() || actor.email;
      } catch {
        // no request user
      }
      const noteEntry: ShipmentNote = {
        text: updateShipmentDto.newNote.text.trim(),
        internal: updateShipmentDto.newNote.internal ?? false,
        createdAt: new Date(),
        createdBy,
      };
      await this.shipmentModel.updateOne(
        { _id: id },
        {
          $push: {
            notes: noteEntry,
            status_history: {
              status: 'note-added',
              note: noteEntry.internal
                ? `Internal note added: ${noteEntry.text}`
                : `Note added: ${noteEntry.text}`,
              timestamp: new Date(),
              updatedBy: createdBy,
              internal: noteEntry.internal,
            },
          },
        },
      );
      delete updateShipmentDto.newNote;
    }

    let autoHistoryNote: string | undefined;

    // AUTO STATUS: Delivery Date entered → Delivered
    if (updateShipmentDto.deliveryDate && !oldShipment.deliveryDate) {
      updateShipmentDto.status = 'delivered';
      autoHistoryNote = 'Shipment Delivered';
    }
    // AUTO STATUS: Pickup Date entered → In Transit
    // Only set in-transit if not already delivered
    else if (
      updateShipmentDto.pickupDate &&
      !oldShipment.pickupDate &&
      updateShipmentDto.status !== 'delivered'
    ) {
      updateShipmentDto.status = 'in-transit';
      autoHistoryNote = 'Pickup confirmed - In Transit';
    }

    const { newNote: _n, notes: _legacyNotes, ...restDto } = updateShipmentDto as any;
    const updateData: any = { ...restDto };

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

    // Never overwrite notes array via $set of a string
    delete updateData.notes;
    delete updateData.newNote;

    const hasFieldUpdates = Object.keys(updateData).length > 0;

    const updatedShipment = hasFieldUpdates
      ? await this.shipmentModel
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
                      note:
                        autoHistoryNote ||
                        `Status updated from ${oldStatus} to ${updateShipmentDto.status}`,
                      internal: false,
                    },
                  },
                }),
            },
            { new: true },
          )
          .populate('quote')
          .populate('customer_id', 'first_name last_name email')
          .orFail(new NotFoundException('Shipment not found'))
      : await this.shipmentModel
          .findById(id)
          .populate('quote')
          .populate('customer_id', 'first_name last_name email')
          .orFail(new NotFoundException('Shipment not found'));

    // Emit status updated event if status changed
    if (updateShipmentDto.status !== undefined && updateShipmentDto.status !== oldStatus) {
      const notifChanges = await this.buildShipmentNotifChanges(updatedShipment);
      try {
        const user = this.requestContext.getUser();
        await this.eventEmitter.emitAsync(
          'action',
          new ShipmentStatusUpdatedAction(user, updatedShipment, {
            oldStatus,
            ...notifChanges,
          }),
        );
      } catch (error) {
        const systemUser = await this.requestContext.getSystemUser();
        await this.eventEmitter.emitAsync(
          'action',
          new ShipmentStatusUpdatedAction(systemUser, updatedShipment, {
            oldStatus,
            ...notifChanges,
          }),
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

    return this.applyNotesToShipment(updatedShipment, false);
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

  private async buildShipmentNotifChanges(shipment: Shipment): Promise<{
    adminIds: string[];
    customerUserId?: string;
  }> {
    const adminIds = await this.userService.findAllAdminIds();
    const linked = shipment.customer_id as any;
    let customerUserId: string | undefined;

    if (linked) {
      customerUserId =
        typeof linked === 'object' && linked._id
          ? String(linked._id)
          : String(linked);
    } else {
      const { email } = resolveShipmentCustomerContact(shipment as any, null);
      if (email) {
        const user = await this.userService.findByEmailOrDefault(email);
        customerUserId = user?._id?.toString();
      }
    }

    return { adminIds, customerUserId };
  }
}
