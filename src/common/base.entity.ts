import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';

export interface ICode {
  tracking_id: string;
}

export abstract class Entity extends Document {
  @ApiProperty({ type: String })
  declare _id: Types.ObjectId;

  @ApiProperty()
  declare createdAt: Date;

  @ApiProperty()
  declare updatedAt: Date;
}
