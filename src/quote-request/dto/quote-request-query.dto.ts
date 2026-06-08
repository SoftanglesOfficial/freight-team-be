import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';
import { QuoteRequestStatus } from '../entities/quote-request.entity';

export class QuoteRequestQueryDto extends PaginationQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tracking_id?: string;

  @ApiProperty({ required: false, enum: QuoteRequestStatus, enumName: 'QuoteRequestStatus' })
  @IsOptional()
  @IsEnum(QuoteRequestStatus)
  status?: QuoteRequestStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer_id?: string;
}
