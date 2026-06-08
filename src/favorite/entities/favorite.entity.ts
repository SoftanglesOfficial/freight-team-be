import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';
import { Entity } from 'src/common/base.entity';

@Schema({ timestamps: true })
export class Favorite extends Entity {
  @ApiProperty({ type: () => Object })
  @Prop({ type: SchemaTypes.ObjectId, refPath: 'resource_type' })
  resource: Types.ObjectId;

  @ApiProperty({ type: String })
  @Prop({ type: String, required: true })
  resource_type: string;

  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

FavoriteSchema.index({ resource: 1, resource_type: 1 }, { unique: true });
