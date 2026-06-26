import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { BolParserService } from './bol-parser.service';
import { Document, DocumentSchema } from './entities/document.entity';
import { Shipment, ShipmentSchema } from 'src/shipment/entities/shipment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
      { name: Shipment.name, schema: ShipmentSchema },
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, BolParserService],
  exports: [DocumentService],
})
export class DocumentModule {}
