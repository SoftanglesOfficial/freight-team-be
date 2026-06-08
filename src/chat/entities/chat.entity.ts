import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Entity } from 'src/common/base.entity';
import { User } from 'src/user/entities/user.entity';
import { ChatMessage } from './chat-message.entity';
import { IFavorite } from 'src/favorite/interface/favorite.interface';

export type ChatDocument = HydratedDocument<Chat>;

export enum ChatEvents {
  CHAT_CREATED = 'chat_created',
  MESSAGE_RECEIVED = 'message_received',
}

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
}

@Schema({ timestamps: true })
export class Chat extends Entity implements IFavorite {
  @ApiProperty({ type: Boolean })
  declare is_favorite: boolean;

  @ApiProperty({ type: () => User, isArray: true })
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User' })
  members: User[];

  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.String })
  name: string;

  @ApiProperty({ enum: ChatType, enumName: 'ChatType' })
  @Prop({ type: SchemaTypes.String, enum: ChatType })
  type: ChatType;

  @ApiProperty({ type: () => User, isArray: true })
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  admins: User[];

  @ApiProperty({ type: () => User, isArray: true })
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'User', default: [] })
  blocked_users: User[];

  @ApiProperty({ type: () => ChatMessage })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'ChatMessage', default: null })
  last_message?: ChatMessage;

  @ApiProperty({ type: Date })
  @Prop({ type: Date, default: null })
  last_message_at?: Date;

  @ApiProperty({ type: Boolean, required: false })
  @Prop({ type: Boolean, default: false })
  is_public?: boolean;

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: null })
  public_room_name?: string;

  @ApiProperty({ type: Number, required: false })
  @Prop({ type: Number, default: 0 })
  max_participants?: number;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
