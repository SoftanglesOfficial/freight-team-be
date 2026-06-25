import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Shipment, ShipmentSchema } from './entities/shipment.entity';
import { Document, DocumentSchema } from '../document/entities/document.entity';
import { QuoteRequest, QuoteRequestSchema } from '../quote-request/entities/quote-request.entity';

import { UserModule } from '../user/user.module';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: QuoteRequest.name, schema: QuoteRequestSchema },
    ]),
    UserModule,
    DocumentModule,
  ],
  controllers: [ShipmentController],
  providers: [ShipmentService],
  exports: [ShipmentService],
})
export class ShipmentModule {}
