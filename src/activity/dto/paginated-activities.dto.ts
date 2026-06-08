import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Activity } from '../entities/activity.entity';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class PaginatedActivitiesDto {
  @ApiProperty({ type: () => [Activity] })
  records: Activity[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([records, count]: [Activity[], number], pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
