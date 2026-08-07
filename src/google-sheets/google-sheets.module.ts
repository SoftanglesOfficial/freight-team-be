import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsController } from './google-sheets.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Shipment, ShipmentSchema } from 'src/shipment/entities/shipment.entity';
import { RequestContextModule } from 'src/request-context/request-context.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shipment.name, schema: ShipmentSchema }]),
    RequestContextModule,
  ],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
