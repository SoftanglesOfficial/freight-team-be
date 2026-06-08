import { ApiProperty } from '@nestjs/swagger';
import { Favorite } from '../entities/favorite.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class PaginatedFavoritesDto {
  @ApiProperty({ type: () => Favorite, isArray: true })
  records: Favorite[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor(records: Favorite[], count: number, pq: PaginationQuery) {
    this.records = records;
    this.pagination = new PaginationDto(pq, count);
  }
}
