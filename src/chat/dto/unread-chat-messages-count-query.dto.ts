import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UnreadChatMessagesCountQueryDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsMongoId()
  chat_id: string;
}
