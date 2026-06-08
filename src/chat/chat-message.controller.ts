import {
  Controller,
  Body,
  Param,
  Req,
  Query,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessageQueryDto } from './dto/chat-message-query.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { PaginatedChatMessagesDto } from './dto/paginated-chat-messages.dto';
import { ChatService } from './chat.service';
import { ChatType } from './entities/chat.entity';
import { BaseController } from 'src/common/base.controller';
import { Role } from 'src/roles/roles.decorator';
import { Get, Patch, Post } from 'src/common/decorators/http.decorator';

@Controller('chat/:chat_id/message')
export class ChatMessageController extends BaseController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatMessageService: ChatMessageService,
  ) {
    super();
  }

  @Post('/', { response: ChatMessage, status: HttpStatus.CREATED })
  async create(
    @Param('chat_id') chatId: string,
    @Body() createChatMessageDto: CreateChatMessageDto,
    @Req() req: Express.Request,
  ): Promise<ChatMessage> {
    const chat = await this.chatService.findOne(chatId);

    // Allow public chat messages without authentication
    if (chat.is_public && chat.type === ChatType.PUBLIC) {
      // For public chats, we handle this through the public chat service
      throw new BadRequestException('Use public chat endpoints for public chats');
    }

    // For private chats, require authentication
    if (!req.user) {
      throw new UnauthorizedException('Authentication required for private chats');
    }

    const message = await this.chatMessageService.create(chatId, createChatMessageDto);
    return message;
  }

  @Get('/', { response: PaginatedChatMessagesDto, status: HttpStatus.OK })
  async findAll(
    @Param('chat_id') chatId: string,
    @Query() query: ChatMessageQueryDto,
    @Req() req: Express.Request,
  ): Promise<PaginatedChatMessagesDto> {
    const chat = await this.chatService.findOne(chatId);

    await this.authorize(
      req.user.roles.includes(Role.STANDARD_USER)
        ? chat.members.some((member) => member._id.toString() === req.user.sub)
        : req.user.roles.includes(Role.SUPER_ADMIN),
    );
    const result = await this.chatMessageService.findAll(chatId, query);
    return new PaginatedChatMessagesDto(result, query);
  }

  @Patch(':id/seen', { response: ChatMessage, status: HttpStatus.OK })
  async markAsSeen(@Param('id') id: string, @Req() req: Express.Request): Promise<ChatMessage> {
    const message = await this.chatMessageService.findOne(id);
    await this.authorize(
      message.chat.members.some((member) => member._id.toString() === req.user.sub) &&
        message.sender._id.toString() !== req.user.sub,
    );
    return this.chatMessageService.markAsSeen(id, req.user.sub);
    // const unreadChatsCount = await this.chatMessageService.getUnreadChatsCount(req.user.id);
    // const unreadChatMessagesCount = await this.chatMessageService.getUnreadChatMessagesCount(
    //   message.chat._id,
    //   req.user.id
    // );
    // await this.actionEventService.emit(
    //   new ChatStatsUpdatedAction(req.user, {
    //     unreadChats: unreadChatsCount,
    //     unreadMessages: unreadChatMessagesCount,
    //     receipients: message.chat.members.map((member) => member._id)
    //   })
    // );
  }
}
