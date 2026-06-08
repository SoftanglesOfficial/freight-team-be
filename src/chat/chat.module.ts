import { Global, Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './entities/chat.entity';
import { ChatMessage, ChatMessageSchema } from './entities/chat-message.entity';
import { ChatMessageController } from './chat-message.controller';
import { ChatMessageService } from './chat-message.service';
import { PublicChatController } from './public-chat.controller';
import { PublicChatService } from './public-chat.service';
import { ChatCleanupService } from './cleanup.service';
import { RegisterEvents } from 'src/common/decorators/register-events.decorator';
import { CHAT_EVENTS } from './chat.events';

@Global()
@RegisterEvents(CHAT_EVENTS)
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController, ChatMessageController, PublicChatController],
  providers: [ChatService, ChatMessageService, PublicChatService, ChatCleanupService],
  exports: [ChatService, ChatMessageService, MongooseModule],
})
export class ChatModule {}
