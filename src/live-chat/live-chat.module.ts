import { Module } from '@nestjs/common';
import { LiveChatService } from './live-chat.service';
import { LiveChatController } from './live-chat.controller';
import { RegisterEvents } from 'src/common/decorators/register-events.decorator';
import { LIVE_CHAT_EVENTS } from './live-chat.events';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveChat, LiveChatSchema } from './entities/live-chat.entity';
import { LiveChatMessage, LiveChatMessageSchema } from './entities/live-chat-message.entity';

@RegisterEvents(LIVE_CHAT_EVENTS)
@Module({
  imports: [
    MongooseModule.forFeature([{ name: LiveChat.name, schema: LiveChatSchema }]),
    MongooseModule.forFeature([{ name: LiveChatMessage.name, schema: LiveChatMessageSchema }]),
  ],
  controllers: [LiveChatController],
  providers: [LiveChatService],
})
export class LiveChatModule {}
