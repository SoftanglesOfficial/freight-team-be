import { Module } from '@nestjs/common';
import { QuoteRequestService } from './quote-request.service';
import { QuoteRequestController } from './quote-request.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteRequest, QuoteRequestSchema } from './entities/quote-request.entity';
import { Shipment, ShipmentSchema } from '../shipment/entities/shipment.entity';
import { RegisterEvents } from 'src/common/decorators/register-events.decorator';
import { QUOTE_REQUEST_EVENTS } from './quote-request.events';

import { UserModule } from 'src/user/user.module';

@RegisterEvents(QUOTE_REQUEST_EVENTS)
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuoteRequest.name, schema: QuoteRequestSchema },
      { name: Shipment.name, schema: ShipmentSchema },
    ]),
    UserModule,
  ],
  controllers: [QuoteRequestController],
  providers: [QuoteRequestService],
})
export class QuoteRequestModule {}
