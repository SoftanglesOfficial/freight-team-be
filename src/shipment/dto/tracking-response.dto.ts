import { ApiProperty } from '@nestjs/swagger';
import { Shipment } from '../entities/shipment.entity';
import { QuoteRequest } from '../../quote-request/entities/quote-request.entity';

export class TrackingResponseDto {
  @ApiProperty({ type: Shipment, nullable: true })
  shipment: Shipment | null;

  @ApiProperty({ type: QuoteRequest, nullable: true })
  quote: QuoteRequest | null;
}
