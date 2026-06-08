import { ApiProperty } from '@nestjs/swagger';
import { Document } from '../entities/document.entity';
import { IPaginated } from 'src/common/dtos/paginated.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class PaginatedDocumentsDto implements IPaginated<Document> {
  @ApiProperty({ type: () => Document, isArray: true })
  records: Document[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([documents, total]: [Document[], number], pq: PaginationQuery) {
    this.records = documents;
    this.pagination = new PaginationDto(pq, total);
  }
}
