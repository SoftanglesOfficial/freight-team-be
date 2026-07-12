import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  IsString,
  IsDateString,
  IsIn,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Address, CustomerInfo, LoadItem } from '../entities/shipment.entity';

export class CreateShipmentDto {
  @ApiProperty({ type: CustomerInfo })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomerInfo)
  customer: CustomerInfo;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({ type: Address })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Address)
  origin_address: Address;

  @ApiProperty({ type: Address })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Address)
  destination_address: Address;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quote_tracking_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ftlWareHouseId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  proNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  carrierName: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  dateOfOrder: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  pickupDate?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  estimatedDeliveryDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: ['yes', 'no'], description: 'Time sensitive shipment indicator' })
  @IsNotEmpty()
  @IsIn(['yes', 'no'])
  timeSensitive: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  mustArriveByDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  timeSensitiveNotes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quoteId?: string;

  @ApiProperty({
    type: [LoadItem],
    required: false,
    description: 'Load items with dimensions and weight',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadItem)
  load_items?: LoadItem[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Array of associated document IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
