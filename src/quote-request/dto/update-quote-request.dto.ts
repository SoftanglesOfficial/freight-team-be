import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateQuoteRequestDto } from './create-quote-request.dto';
import { QuoteRequestStatus } from '../entities/quote-request.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, ValidateIf } from 'class-validator';

export class UpdateQuoteRequestDto {
  @ApiProperty({
    enum: QuoteRequestStatus,
    enumName: 'QuoteRequestStatus',
  })
  @IsEnum(QuoteRequestStatus)
  @IsOptional()
  status?: QuoteRequestStatus;

  @ApiProperty({ required: false, example: 1500.5, nullable: true })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @IsOptional()
  quoteAmount?: number | null;

  @ApiProperty({ required: false, example: 'CQ-12345', nullable: true })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  @IsOptional()
  carrierQuoteNumber?: string | null;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiProperty({ required: false, nullable: true })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  @IsOptional()
  carrier?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @IsOptional()
  estimatedTransitDays?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @IsOptional()
  target_price?: number | null;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  feedback?: any;
}
