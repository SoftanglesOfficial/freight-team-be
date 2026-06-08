import { Chat } from '../entities/chat.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedChatsDto {
  @ApiProperty({ type: () => Chat, isArray: true })
  records: Chat[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor(records: Chat[], count: number, pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
