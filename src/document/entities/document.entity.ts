import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsUrl, Matches } from 'class-validator';
import { Entity } from 'src/common/base.entity';
import { SchemaTypes, Types } from 'mongoose';
import { User } from 'src/user/entities/user.entity';

export enum DocumentCategory {
  INVOICE = 'Invoice',
  BOL = 'BOL',
}

@Schema({ timestamps: true })
export class Document extends Entity {
  @ApiProperty({ enum: DocumentCategory, enumName: 'DocumentCategory' })
  @Prop({ type: String, enum: DocumentCategory })
  category: DocumentCategory;

  @ApiProperty({
    description: 'The name of the document',
    example: 'Invoice-001.pdf',
  })
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({
    description: 'The size of the document in bytes',
    example: 1024000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Prop({ type: Number, required: true })
  size: number;

  @ApiProperty({
    description: 'The MIME type of the document',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true })
  type: string;

  @ApiProperty({
    description: 'The internal ID in format sh-0000000 (auto-generated)',
    example: 'sh-0000123',
  })
  @Prop({ type: String, required: true, unique: true, index: true })
  internal_id: string;

  @ApiProperty({
    description: 'The URL where the document is stored',
    example: 'https://ik.imagekit.io/gbeubjjsq/uploads/document_123.pdf',
  })
  @IsNotEmpty()
  @IsUrl()
  @Prop({ type: String, required: true })
  url: string;

  @ApiProperty({
    description: 'The file ID from the storage service',
    example: 'file_123',
    required: false,
  })
  @IsString()
  @Prop({ type: String, required: false })
  file_id?: string;

  @ApiProperty({
    description: 'ID of the associated shipment',
    type: String,
    required: false,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Shipment',
    required: false,
    index: true,
  })
  shipment_id?: Types.ObjectId;

  @ApiProperty({
    description: 'ID of the associated quote request',
    type: String,
    required: false,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'QuoteRequest',
    required: false,
    index: true,
  })
  quote_request_id?: Types.ObjectId;

  @ApiProperty({
    description: 'ID of the assigned customer (User)',
    oneOf: [{ type: 'string' }, { $ref: getSchemaPath(User) }],
    required: false,
    nullable: true,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  customer?: Types.ObjectId | User;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  fallback_email?: string;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  fallback_name?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
