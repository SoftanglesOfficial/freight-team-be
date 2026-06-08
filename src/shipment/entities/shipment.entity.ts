import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsEmail, IsIn, IsString } from 'class-validator';
import { Entity } from 'src/common/base.entity';
import { SchemaTypes, Types } from 'mongoose';
import { QuoteRequest } from 'src/quote-request/entities/quote-request.entity';

export class Address {
  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  formatted_address: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  street_address: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  city: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  state: string;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  zip_code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  country: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Prop({ type: Number, required: false, default: 0 })
  latitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Prop({ type: Number, required: false, default: 0 })
  longitude: number;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  place_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Prop({ type: String, required: false })
  businessName: string;
}

export class CustomerInfo {
  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @Prop({ type: String, required: false })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  company_name?: string;
}

export class CurrentLocation {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  @Prop({ type: Number, required: true })
  latitude: number;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  @Prop({ type: Number, required: true })
  longitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: Date, required: false })
  updatedAt?: Date;
}

export class LoadItem {
  @ApiProperty({ description: 'Weight in lbs' })
  @IsNotEmpty()
  @Prop({ type: Number, required: true })
  weight: number;

  @ApiProperty({ description: 'Length in inches' })
  @IsNotEmpty()
  @Prop({ type: Number, required: true })
  length: number;

  @ApiProperty({ description: 'Width in inches' })
  @IsNotEmpty()
  @Prop({ type: Number, required: true })
  width: number;

  @ApiProperty({ description: 'Height in inches' })
  @IsNotEmpty()
  @Prop({ type: Number, required: true })
  height: number;

  @ApiProperty({ description: 'Quantity of items', default: 1, required: false })
  @IsOptional()
  @Prop({ type: Number, required: false, default: 1 })
  quantity?: number;

  @ApiProperty({ description: 'Description of the load item', required: false })
  @IsOptional()
  @IsString()
  @Prop({ type: String, required: false })
  description?: string;
}

export class StatusHistoryEntry {
  @ApiProperty()
  @Prop({ type: String, required: true })
  status: string;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  note?: string;

  @ApiProperty({ required: false })
  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
    required: false,
    _id: false,
  })
  location?: {
    latitude: number;
    longitude: number;
  };

  @ApiProperty()
  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false })
  updatedBy?: string;
}

@Schema({ timestamps: true })
export class Shipment extends Entity {
  @ApiProperty({ type: CustomerInfo })
  @IsNotEmpty()
  @Prop({ type: CustomerInfo, required: true })
  customer: CustomerInfo;

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

  @ApiProperty({ type: Address })
  @IsNotEmpty()
  @Prop({ type: Address, required: true })
  origin_address: Address;

  @ApiProperty({ type: Address })
  @IsNotEmpty()
  @Prop({ type: Address, required: true })
  destination_address: Address;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Prop({ type: String, required: false })
  quote_tracking_id?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  ftlWareHouseId: string;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: String, required: true, unique: true, index: true })
  proNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  carrierName: string;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: Date, required: true })
  dateOfOrder: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: Date, required: false })
  pickupDate?: Date;

  @ApiProperty()
  @IsNotEmpty()
  @Prop({ type: Date, required: true })
  estimatedDeliveryDate: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: Date, required: false })
  deliveryDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  notes?: string;

  @ApiProperty({ enum: ['yes', 'no'], description: 'Time sensitive shipment indicator' })
  @IsNotEmpty()
  @IsIn(['yes', 'no'])
  @Prop({ type: String, required: true, enum: ['yes', 'no'] })
  timeSensitive: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: Date, required: false })
  mustArriveByDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Prop({ type: String, required: false })
  timeSensitiveNotes?: string;

  @ApiProperty({
    description: 'The associated quote request (populated when fetched)',
    oneOf: [{ type: 'string' }, { $ref: getSchemaPath(QuoteRequest) }],
    required: false,
    nullable: true,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'QuoteRequest',
    required: false,
    index: true,
  })
  quote?: Types.ObjectId | QuoteRequest;

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

  @ApiProperty({
    description: 'Array of load items with dimensions and weight',
    type: [LoadItem],
    required: false,
  })
  @IsOptional()
  @Prop({ type: [LoadItem], required: false, default: [], _id: false })
  load_items?: LoadItem[];

  @ApiProperty({ type: CurrentLocation, required: false })
  @IsOptional()
  @Prop({ type: CurrentLocation, required: false, _id: false })
  current_location?: CurrentLocation;

  @ApiProperty({
    enum: ['pending', 'in-transit', 'delivered'],
    description: 'Shipment status',
    required: false,
  })
  @IsOptional()
  @IsIn(['pending', 'in-transit', 'delivered'])
  @Prop({
    type: String,
    required: false,
    enum: ['pending', 'in-transit', 'delivered'],
    default: 'pending',
  })
  status?: 'pending' | 'in-transit' | 'delivered';

  @ApiProperty({ type: [StatusHistoryEntry], required: false })
  @Prop({ type: [StatusHistoryEntry], default: [] })
  status_history: StatusHistoryEntry[];
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
