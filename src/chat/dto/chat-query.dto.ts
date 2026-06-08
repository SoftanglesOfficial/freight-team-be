import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsMongoId } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { Transform } from 'class-transformer';
import { ToBoolean } from 'src/common/transformers/types.transformer';

export class ChatQueryDto extends PaginationQuery {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsMongoId()
  user_id?: string;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(ToBoolean)
  is_favorite?: boolean;
}
