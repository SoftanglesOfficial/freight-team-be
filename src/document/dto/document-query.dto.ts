import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNotEmpty, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentCategory } from '../entities/document.entity';
import { PaginationQuery } from 'src/common/dtos/pagination-query.dto';

export class DocumentQueryDto extends PaginationQuery {
  @ApiProperty({
    enum: DocumentCategory,
    enumName: 'DocumentCategory',
    description: 'The category of the document',
    example: DocumentCategory.INVOICE,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiProperty({
    description: 'Search term to filter documents by name',
    example: 'invoice',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by document type',
    example: 'application/pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by shipment ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  shipment_id?: string;

  @ApiProperty({
    description: 'Filter by quote request ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  quote_request_id?: string;

  @ApiProperty({
    description: 'Filter by customer ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiProperty({
    description: 'Filter by customer email',
    example: 'customer@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_email?: string;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'name', 'size'],
    required: false,
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'size'])
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
