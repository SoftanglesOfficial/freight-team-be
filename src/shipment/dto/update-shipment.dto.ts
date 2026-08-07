import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreateShipmentDto } from './create-shipment.dto';
import {
  IsOptional,
  ValidateNested,
  IsString,
  IsDateString,
  IsIn,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Address, CustomerInfo } from '../entities/shipment.entity';

export class NewShipmentNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  internal?: boolean;
}

export class UpdateShipmentDto extends PartialType(
  OmitType(CreateShipmentDto, ['notes'] as const),
) {
  @ApiProperty({ type: CustomerInfo, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfo)
  customer?: CustomerInfo;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({ type: Address, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Address)
  origin_address?: Address;

  @ApiProperty({ type: Address, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => Address)
  destination_address?: Address;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quote_tracking_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ftlWareHouseId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  proNumber?: string;

  @ApiProperty({ required: false, description: 'Customer PO number' })
  @IsString()
  @IsOptional()
  poNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  carrierName?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfOrder?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  pickupDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @ApiProperty({ type: NewShipmentNoteDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewShipmentNoteDto)
  newNote?: NewShipmentNoteDto;

  @ApiProperty({
    enum: ['yes', 'no'],
    description: 'Time sensitive shipment indicator',
    required: false,
  })
  @IsIn(['yes', 'no'])
  @IsOptional()
  timeSensitive?: string;

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
    enum: ['pending', 'in-transit', 'delivered'],
    description: 'Shipment status',
    required: false,
  })
  @IsOptional()
  @IsIn(['pending', 'in-transit', 'delivered'])
  status?: 'pending' | 'in-transit' | 'delivered';
}
