import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { Entity, ICode } from 'src/common/base.entity';
import { ToNumber } from 'src/common/transformers/types.transformer';
import { SchemaTypes, Types } from 'mongoose';

export enum QuoteRequestStatus {
  PENDING_QUOTE = 'Pending Quote',
  IN_PROGRESS = 'In Progress',
  QUOTED = 'Quoted',
  ACCEPTED = 'Accepted',
  ACTIVE_SHIPMENT = 'Active Shipment',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  DECLINED = 'Declined',
  NOT_ACCEPTED = 'Not accepted',
}

export class Pallet {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(ToNumber)
  @Prop({ type: Number, required: true })
  weight: number;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(ToNumber)
  @Prop({ type: Number, required: true })
  length: number;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(ToNumber)
  @Prop({ type: Number, required: true })
  width: number;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(ToNumber)
  @Prop({ type: Number, required: true })
  height: number;
}

@Schema({ timestamps: true })
export class QuoteRequest extends Entity implements ICode {
  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  is_time_sensitive: boolean;

  @ApiProperty({ required: false })
  @Prop({ type: Date, required: false })
  delivery_date?: Date;

  @ApiProperty()
  @Prop({ type: String, required: true })
  origin_zip_code: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  destination_zip_code: string;

  @ApiProperty({ type: [Pallet] })
  @Prop({ type: [Pallet], required: true })
  pallets: Pallet[];

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  special_instructions?: string;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  is_residential: boolean;

  @ApiProperty()
  @Prop({ type: String, required: true })
  full_name: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  email: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  phone: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  company_name: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  tracking_id: string;

  @ApiProperty({
    enum: QuoteRequestStatus,
    enumName: 'QuoteRequestStatus',
  })
  @Prop({
    type: String,
    required: true,
    enum: QuoteRequestStatus,
    default: QuoteRequestStatus.PENDING_QUOTE,
  })
  status: QuoteRequestStatus;

  @ApiProperty({
    description: 'Array of associated document IDs',
    type: [String],
    required: false,
  })
  @Prop({
    type: [SchemaTypes.ObjectId],
    ref: 'Document',
    required: false,
    default: [],
  })
  documents?: Types.ObjectId[];

  @ApiProperty({ required: false, nullable: true })
  @Prop({ type: Number, required: false, default: null })
  quoteAmount?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Prop({ type: String, required: false, default: null })
  carrierQuoteNumber?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Prop({ type: String, required: false, default: null })
  carrier?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Prop({ type: Number, required: false, default: null })
  estimatedTransitDays?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Prop({ type: Number, required: false, default: null })
  target_price?: number | null;

  @ApiProperty({ required: false, type: Object })
  @Prop({ type: SchemaTypes.Mixed, required: false, default: {} })
  feedback?: any;

  @ApiProperty({
    description: 'ID of the associated customer (User)',
    type: String,
    required: false,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  customer_id?: Types.ObjectId;

  @ApiProperty({ default: false })
  @Prop({ type: Boolean, default: false })
  convertedToShipment: boolean;
}

export const QuoteRequestSchema = SchemaFactory.createForClass(QuoteRequest);
