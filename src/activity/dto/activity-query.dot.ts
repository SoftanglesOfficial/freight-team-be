import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class ActivityQueryDto extends PaginationQuery {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsMongoId()
  entity_id?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsMongoId()
  user_id?: string;
}
