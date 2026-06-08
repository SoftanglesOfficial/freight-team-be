import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Pallet } from '../entities/quote-request.entity';
import { ToBoolean } from 'src/common/transformers/types.transformer';

export class CreateQuoteRequestDto {
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(ToBoolean)
  is_time_sensitive?: boolean;

  @ApiProperty({ required: false, default: new Date().toISOString() })
  @IsDateString()
  @IsOptional()
  delivery_date?: string;

  @ApiProperty({ required: true, example: '10001' })
  @IsString()
  @IsNotEmpty()
  origin_zip_code: string;

  @ApiProperty({ required: true, example: '10002' })
  @IsString()
  @IsNotEmpty()
  destination_zip_code: string;

  @ApiProperty({ type: [Pallet], example: [{ weight: 100, length: 100, width: 100, height: 100 }] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Pallet)
  pallets: Pallet[];

  @ApiProperty({ required: false, example: 'Special instructions' })
  @IsString()
  @IsOptional()
  special_instructions?: string;

  @ApiProperty({ required: false, default: false })
  @Transform(ToBoolean)
  @IsOptional()
  is_residential?: boolean;

  @ApiProperty({ required: true, example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ required: true, example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: true, example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, example: 'Example Inc.' })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiProperty({ required: false, example: 1500.5 })
  @IsNumber()
  @IsOptional()
  quoteAmount?: number;

  @ApiProperty({ required: false, example: 'CQ-12345' })
  @IsString()
  @IsOptional()
  carrierQuoteNumber?: string;
}
