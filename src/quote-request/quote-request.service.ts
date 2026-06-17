import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';
import { InjectModel } from '@nestjs/mongoose';
import { QuoteRequest, QuoteRequestStatus } from './entities/quote-request.entity';
import { Shipment } from '../shipment/entities/shipment.entity';
import { FilterQuery, Model, Types } from 'mongoose';
import { QuoteRequestQueryDto } from './dto/quote-request-query.dto';
import { SequenceService } from 'src/common/services/sequence/sequence.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuoteRequestCreatedAction } from './actions/quote-request-created.action';
import { QuoteRequestUpdatedAction } from './actions/quote-request-updated.action';
import { QuoteRequestDeletedAction } from './actions/quote-request-deleted.action';
import { QuoteFollowUpAction } from './actions/quote-follow-up.action';
import { QuoteAcceptedAction } from './actions/quote-accepted.action';

import { MailerService } from 'src/mailer/mailer.service';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { RequestContextService } from 'src/request-context/request-context.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class QuoteRequestService {
  constructor(
    @InjectModel(QuoteRequest.name) private quoteModel: Model<QuoteRequest>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    private readonly sequenceService: SequenceService,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
    private readonly userService: UserService,
  ) {}

  async sendQuote(
    id: string,
    data: { quoteAmount: number; carrier: string; estimatedTransitDays: number; notes?: string },
  ): Promise<{ message: string }> {
    // Update the quote with the amount and status
    await this.quoteModel.findByIdAndUpdate(id, {
      quoteAmount: data.quoteAmount,
      carrier: data.carrier,
      estimatedTransitDays: data.estimatedTransitDays,
      status: QuoteRequestStatus.QUOTED,
    });

    const quote = await this.findOne(id);
    await this.eventEmitter.emitAsync(
      'action',
      new QuoteRequestUpdatedAction(this.requestContext.getUser(), quote),
    );

    return { message: 'Quote email sent successfully' };
  }

  async create(createQuoteRequestDto: CreateQuoteRequestDto): Promise<QuoteRequest> {
    const quote = await this.quoteModel.create({
      ...createQuoteRequestDto,
      tracking_id: await this.sequenceService.getCode(this.quoteModel, 'QTR'),
      convertedToShipment: false, // New quotes are never converted yet
    });
    await this.eventEmitter.emitAsync('action', new QuoteRequestCreatedAction({}, quote));

    // Return with computed convertedToShipment (should be false for new quotes)
    const quoteObj = quote.toObject();
    quoteObj.convertedToShipment = false;
    return quoteObj as QuoteRequest;
  }

  async findAll(query: QuoteRequestQueryDto): Promise<[QuoteRequest[], number]> {
    const filter: FilterQuery<QuoteRequest> = {};
    if (query.email) {
      filter['email'] = query.email;
    }
    if (query.customer_id) {
      const user = await this.userService.getProfile(query.customer_id);
      if (user) {
        filter['email'] = user.email;
      }
    }
    if (query.status) {
      filter['status'] = query.status;
    }
    const quotes = await this.quoteModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.pageSize)
      .exec();
    const count = await this.quoteModel.countDocuments(filter).exec();

    // Compute convertedToShipment for each quote
    const quotesWithConversionStatus = await Promise.all(
      quotes.map(async (quote) => {
        const shipmentExists = await this.shipmentModel.exists({
          quote: new Types.ObjectId(quote._id),
        });
        const quoteObj = quote.toObject();
        quoteObj.convertedToShipment = !!shipmentExists;
        return quoteObj as QuoteRequest;
      }),
    );

    return [quotesWithConversionStatus, count];
  }

  async findOne(id: string): Promise<QuoteRequest> {
    const quote = await this.quoteModel
      .findById(id)
      .orFail(new NotFoundException('Quote request not found'));

    // Compute convertedToShipment
    const shipmentExists = await this.shipmentModel.exists({
      quote: new Types.ObjectId(id),
    });

    const quoteObj = quote.toObject();

    quoteObj.convertedToShipment = !!shipmentExists;

    return quoteObj as QuoteRequest;
  }

  async findByTrackingId(trackingId: string): Promise<QuoteRequest> {
    const quote = await this.quoteModel
      .findOne({ tracking_id: trackingId })
      .orFail(new NotFoundException('Quote request not found'));

    // Compute convertedToShipment
    const shipmentExists = await this.shipmentModel.exists({
      quote: new Types.ObjectId(quote._id),
    });

    const quoteObj = quote.toObject();
    quoteObj.convertedToShipment = !!shipmentExists;
    return quoteObj as QuoteRequest;
  }

  async update(id: string, updateQuoteRequestDto: UpdateQuoteRequestDto): Promise<QuoteRequest> {
    const quote = await this.quoteModel
      .findByIdAndUpdate(id, updateQuoteRequestDto, { new: true })
      .orFail(new NotFoundException('Quote request not found'));

    // Compute convertedToShipment
    const shipmentExists = await this.shipmentModel.exists({
      quote: new Types.ObjectId(id),
    });
    if (updateQuoteRequestDto.status === QuoteRequestStatus.DECLINED) {
      await this.eventEmitter.emitAsync(
        'action',
        new QuoteFollowUpAction(this.requestContext.getUser(), quote),
      );
    } else {
      await this.eventEmitter.emitAsync(
        'action',
        new QuoteRequestUpdatedAction(this.requestContext.getUser(), quote),
      );
    }

    const quoteObj = quote.toObject();
    quoteObj.convertedToShipment = !!shipmentExists;
    return quoteObj as QuoteRequest;
  }

  async declineQuote(id: string, feedback: any): Promise<QuoteRequest> {
    const quote = await this.quoteModel
      .findByIdAndUpdate(
        id,
        { status: QuoteRequestStatus.DECLINED, feedback },
        { new: true },
      )
      .orFail(new NotFoundException('Quote request not found'));

    let user: any = null;
    try {
      user = this.requestContext.getUser();
    } catch {}

    await this.eventEmitter.emitAsync(
      'action',
      new QuoteFollowUpAction(user, quote),
    );

    return quote.toObject() as QuoteRequest;
  }

  async acceptAndConvert(id: string, data: any): Promise<Shipment> {
    const quote = await this.quoteModel
      .findById(id)
      .orFail(new NotFoundException('Quote request not found'));

    // Create a new shipment from the quote
    const shipment = await this.shipmentModel.create({
      customer: {
        name: quote.full_name,
        email: quote.email,
        phone: (quote as any).phone,
        company_name: quote.company_name,
      },
      customer_id: quote.customer_id,
      origin_address: {
        zip_code: quote.origin_zip_code,
        street_address: data.origin_street,
        city: data.origin_city,
        state: data.origin_state,
        businessName: data.origin_business_name,
        country: data.origin_country || 'US',
      },
      destination_address: {
        zip_code: quote.destination_zip_code,
        street_address: data.destination_street,
        city: data.destination_city,
        state: data.destination_state,
        businessName: data.destination_business_name,
        country: data.destination_country || 'US',
      },
      quote: quote._id,
      quote_tracking_id: quote.tracking_id,
      carrierName: quote.carrier || 'TBD',
      ftlWareHouseId: await this.sequenceService.getCode(this.shipmentModel, 'FTL', 'ftlWareHouseId'),
      proNumber: await this.sequenceService.getCode(this.shipmentModel, 'PRO', 'proNumber'),
      dateOfOrder: new Date(),
      estimatedDeliveryDate: data.estimatedDeliveryDate || quote.delivery_date || new Date(),
      pickupDate: data.pickupDate,
      notes: data.notes || quote.special_instructions,
      timeSensitive: quote.is_time_sensitive ? 'yes' : 'no',
      status: 'pending',
      load_items: quote.pallets?.map((item) => ({
        weight: item.weight,
        length: item.length,
        width: item.width,
        height: item.height,
        quantity: (item as any).quantity || 1,
        description: (item as any).description || 'Pallet',
      })),
    });

    // Update quote status
    await this.quoteModel.findByIdAndUpdate(id, {
      status: QuoteRequestStatus.ACCEPTED,
    });

    let user: any = null;
    try {
      user = this.requestContext.getUser();
    } catch {}

    await this.eventEmitter.emitAsync(
      'action',
      new QuoteAcceptedAction(user, quote),
    );

    return shipment;
  }

  async remove(id: string): Promise<QuoteRequest> {
    const quote = await this.quoteModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException('Quote request not found'));
    await this.eventEmitter.emitAsync(
      'action',
      new QuoteRequestDeletedAction(this.requestContext.getUser(), quote),
    );
    return quote;
  }
}
