import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LiveChatMessage {
  @ApiProperty()
  @Prop()
  message: string;

  @ApiProperty()
  @Prop({ default: false })
  seen: boolean;

  @ApiProperty()
  @Prop()
  sender_id: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId, ref: 'LiveChat' })
  chat_id: Types.ObjectId;
}

export const LiveChatMessageSchema = SchemaFactory.createForClass(LiveChatMessage);
export type LiveChatMessageDocument = HydratedDocument<LiveChatMessage>;
