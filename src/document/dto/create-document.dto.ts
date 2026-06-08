import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsUrl,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { DocumentCategory } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'The name of the document',
    example: 'Invoice-001.pdf',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The size of the document in bytes',
    example: 1024000,
  })
  @IsNotEmpty()
  @IsNumber()
  size: number;

  @ApiProperty({
    description: 'The MIME type of the document',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'The URL where the document is stored',
    example: 'https://ik.imagekit.io/gbeubjjsq/uploads/document_123.pdf',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'The file ID from the storage service',
    example: 'file_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  file_id?: string;

  @ApiProperty({
    description: 'ID of the associated shipment',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  shipment_id?: string;

  @ApiProperty({
    description: 'ID of the associated quote request',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  quote_request_id?: string;

  @ApiProperty({
    description: 'ID of the assigned customer',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiProperty({
    enum: DocumentCategory,
    enumName: 'DocumentCategory',
    description: 'The category of the document',
    example: DocumentCategory.INVOICE,
  })
  @IsNotEmpty()
  @IsEnum(DocumentCategory)
  category: DocumentCategory;
}
