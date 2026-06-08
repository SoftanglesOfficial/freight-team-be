import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { Shipment } from '../entities/shipment.entity';

export class PaginatedShipmentsDto {
  @ApiProperty({ type: () => Shipment, isArray: true })
  records: Shipment[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([records, count]: [Shipment[], number], pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
