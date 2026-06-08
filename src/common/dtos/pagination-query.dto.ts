import { Transform, Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToNumber } from '../transformers/types.transformer';

export class PaginationQuery {
  @ApiProperty({ default: 1 })
  @Transform(ToNumber)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({ default: 10 })
  @Transform(ToNumber)
  @IsInt()
  @Min(1)
  pageSize: number;

  get skip() {
    return (this.page - 1) * this.pageSize;
  }
}
