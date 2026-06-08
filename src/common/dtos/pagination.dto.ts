import { PaginationQuery } from './pagination-query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;

  constructor(pq: PaginationQuery, total: number) {
    this.currentPage = pq.page;
    this.pageSize = pq.pageSize;
    this.totalRecords = total;
    this.totalPages = Math.ceil(total / pq.pageSize);
  }
}
