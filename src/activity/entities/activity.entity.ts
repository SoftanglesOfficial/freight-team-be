import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Entity } from 'src/common/base.entity';
import { UserPreview } from 'src/user/entities/user.entity';
import { ActionType } from 'src/common/class/action.class';

export class EntityInfo {
  @ApiProperty()
  @Prop({ type: String })
  type: string;

  @ApiProperty({ type: String })
  @Prop({ type: String })
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String })
  title: string;
}

@Schema({ timestamps: true })
export class Activity extends Entity {
  @ApiProperty()
  @Prop({ type: String })
  message: string;

  @ApiProperty({ enum: ActionType, enumName: 'ActionType' })
  @Prop({ required: true, enum: ActionType })
  action: ActionType;

  @ApiProperty({ type: EntityInfo })
  @Prop({ type: EntityInfo })
  entity: EntityInfo;

  @ApiProperty({
    type: UserPreview,
  })
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: UserPreview | Types.ObjectId;

  @ApiProperty({ required: false, type: Object })
  @Prop({ type: SchemaTypes.Mixed })
  change?: Record<string, any>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
