import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class ChatMessageQueryDto extends PaginationQuery {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
