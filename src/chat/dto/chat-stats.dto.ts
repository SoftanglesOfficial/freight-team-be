import { ApiProperty } from '@nestjs/swagger';

export class ChatUnreadMessages {
  @ApiProperty({ type: Number })
  total_unread_messages: number;

  @ApiProperty({ type: String })
  chat_id: string;
}

export class ChatStatsDto {
  @ApiProperty({ type: ChatUnreadMessages, isArray: true })
  chat_unread_messages: ChatUnreadMessages[];

  @ApiProperty({ type: Number })
  total_unread_chats: number;
}
