import { ApiProperty } from '@nestjs/swagger';

import { Notification } from '../entities/notification.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { IPaginated } from 'src/common/dtos/paginated.dto';

export class PaginatedNotificationsDto implements IPaginated<Notification> {
  @ApiProperty({ type: () => Notification, isArray: true })
  records: Notification[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([notifications, total]: [Notification[], number], pq: PaginationQuery) {
    this.records = notifications;
    this.pagination = new PaginationDto(pq, total);
  }
}
