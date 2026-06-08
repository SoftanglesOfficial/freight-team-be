import { ApiProperty } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class PaginatedChatMessagesDto {
  @ApiProperty({ type: () => ChatMessage, isArray: true })
  records: ChatMessage[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([records, count]: [ChatMessage[], number], pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
