import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ChatMessageType } from '../entities/chat-message.entity';

export class CreateChatMessageDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'object' }, { type: 'array' }],
  })
  @IsNotEmpty()
  content: unknown;

  @ApiProperty({
    type: String,
    enum: ChatMessageType,
    enumName: 'ChatMessageType',
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(ChatMessageType)
  type: ChatMessageType;
}
