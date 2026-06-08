import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Model, Query, SchemaTypes, Types } from 'mongoose';
import { EntityInfo } from 'src/activity/entities/activity.entity';
import { Entity } from 'src/common/base.entity';
import { UserPreview } from 'src/user/entities/user.entity';

@Schema({ timestamps: true })
export class Notification extends Entity {
  @ApiProperty()
  @Prop({ type: String })
  message: string;

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

  @ApiProperty({ type: EntityInfo })
  @Prop({ type: EntityInfo })
  entity: EntityInfo;

  @ApiProperty()
  @Prop({ type: String })
  action: string;

  @ApiProperty({ required: false })
  @Prop({ type: String })
  url?: string;

  @ApiProperty()
  @Prop({ type: String })
  seen: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
