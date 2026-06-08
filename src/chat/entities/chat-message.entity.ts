import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Entity } from 'src/common/base.entity';
import { Chat } from '../entities/chat.entity';
import { User } from 'src/user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export enum ChatMessageType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  File = 'file',
  Url = 'url',
  GeoLocation = 'geo_location',
  Entity = 'entity',
}

@Schema({ timestamps: true })
export class ChatMessage extends Entity {
  @ApiProperty({ type: () => User })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  sender: User;

  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.Mixed })
  content: unknown;

  @ApiProperty({ enum: ChatMessageType, enumName: 'ChatMessageType' })
  @Prop({ type: SchemaTypes.String, enum: ChatMessageType })
  type: ChatMessageType;

  @ApiProperty({ type: () => User, isArray: true })
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  delivered_to: User[];

  @ApiProperty({ type: () => User, isArray: true })
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  seen_by: User[];

  @ApiProperty({ type: Boolean })
  @Prop({ type: SchemaTypes.Boolean, default: false })
  seen: boolean;

  @ApiProperty({ type: () => Chat })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Chat' })
  chat: Chat;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
