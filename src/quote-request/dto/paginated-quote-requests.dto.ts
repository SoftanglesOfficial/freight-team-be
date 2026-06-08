import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { QuoteRequest } from '../entities/quote-request.entity';

export class PaginatedQuoteRequestsDto {
  @ApiProperty({ type: () => QuoteRequest, isArray: true })
  records: QuoteRequest[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([records, count]: [QuoteRequest[], number], pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
