import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { IPaginated } from 'src/common/dtos/paginated.dto';
import { User } from '../entities/user.entity';

export class PaginatedUsersDto implements IPaginated<User> {
  @ApiProperty({ type: () => User, isArray: true })
  records: User[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  constructor([users, total]: [User[], number], pq: PaginationQuery) {
    this.records = users;
    this.pagination = new PaginationDto(pq, total);
  }
}
