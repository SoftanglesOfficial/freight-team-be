import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaType, SchemaTypes } from 'mongoose';
import { Entity } from 'src/common/base.entity';

export class UnreadStats {
  @ApiProperty()
  for_admins: number;

  @ApiProperty()
  for_user: number;
}

@Schema({ timestamps: true })
export class LiveChat extends Entity {
  @ApiProperty()
  @Prop()
  anon_id: string;

  @ApiProperty()
  @Prop()
  subject: string;

  @ApiProperty()
  @Prop()
  user_name: string;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  user_email?: string;

  @ApiProperty()
  @Prop({ default: false })
  is_archived: boolean;

  @ApiProperty({ type: UnreadStats })
  @Prop({ type: SchemaTypes.Mixed, default: { for_admins: 0, for_user: 0 } })
  unread_stats: UnreadStats;
}

export const LiveChatSchema = SchemaFactory.createForClass(LiveChat);
export type LiveChatDocument = HydratedDocument<LiveChat>;
