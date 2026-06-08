import { Controller, Body, Param, Query, UseGuards, Post, Get } from '@nestjs/common';
import { PublicChatService } from './public-chat.service';
import { CreatePublicChatMessageDto } from './dto/create-public-chat-message.dto';
import { JoinPublicChatDto } from './dto/join-public-chat.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { Chat } from './entities/chat.entity';
import { ChatService } from './chat.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Public Chat')
@Controller('public-chat')
export class PublicChatController {
  constructor(
    private readonly publicChatService: PublicChatService,
    private readonly chatService: ChatService,
  ) {}

  @Post('/join')
  @ApiOperation({ summary: 'Join a public chat room' })
  @ApiResponse({ status: 200, description: 'Successfully joined public chat' })
  async joinPublicChat(
    @Body() joinDto: JoinPublicChatDto,
  ): Promise<{ chat: Chat; anonymous_user: any }> {
    return this.publicChatService.joinPublicChat(joinDto);
  }

  @Get('/rooms')
  @ApiOperation({ summary: 'Get all public chat rooms' })
  @ApiResponse({ status: 200, description: 'List of public chat rooms' })
  async getPublicChatRooms(): Promise<Chat[]> {
    return this.chatService.getPublicChats();
  }

  @Post('/:chatId/messages')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Send a message to a public chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() messageDto: CreatePublicChatMessageDto,
  ): Promise<ChatMessage> {
    return this.publicChatService.sendPublicMessage(chatId, messageDto);
  }

  @Get('/:chatId/messages')
  @ApiOperation({ summary: 'Get messages from a public chat' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: number,
  ): Promise<ChatMessage[]> {
    const limitNum = limit ? parseInt(limit.toString()) : 50;
    return this.publicChatService.getPublicChatMessages(chatId, limitNum);
  }

  @Get('/:chatId/participants')
  @ApiOperation({ summary: 'Get active participants in a public chat' })
  @ApiResponse({ status: 200, description: 'List of active participants' })
  getParticipants(@Param('chatId') chatId: string) {
    return this.publicChatService.getActiveParticipants(chatId);
  }
}
