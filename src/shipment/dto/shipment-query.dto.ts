import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class ShipmentQueryDto extends PaginationQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  proNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer_email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfOrder_from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfOrder_to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  pickupDate_from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  pickupDate_to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate_from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate_to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate_from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate_to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quoteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer_id?: string;
}
