import {
  Controller,
  Body,
  Param,
  Req,
  Query,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { PaginatedChatsDto } from './dto/paginated-chats.dto';
import { BaseController } from 'src/common/base.controller';
import { Chat, ChatType } from './entities/chat.entity';
import { TrackFavorite } from 'src/favorite/decorator/track-favorite.decorator';
import { Role } from 'src/roles/roles.decorator';
import { ChatQueryDto } from './dto/chat-query.dto';
import { Delete, Get, Patch, Post } from 'src/common/decorators/http.decorator';
import { ChatMessageService } from './chat-message.service';
import { ChatStatsDto } from './dto/chat-stats.dto';

@Controller('chat')
export class ChatController extends BaseController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatMessageService: ChatMessageService,
  ) {
    super();
  }

  @Get('/unread-stats', { response: ChatStatsDto, status: HttpStatus.OK })
  async getUnreadStats(@Req() req: Express.Request): Promise<ChatStatsDto> {
    return this.chatMessageService.getUnreadStats(req.user.sub);
  }

  @TrackFavorite('Chat')
  @Post('/', { response: Chat, status: HttpStatus.CREATED })
  async create(@Body() createChatDto: CreateChatDto, @Req() req: Express.Request): Promise<Chat> {
    const chat = await this.chatService.findOneByOnlyMembers([
      ...createChatDto.members.map((member) => member.toString()),
      req.user.sub,
    ]);
    if (chat) {
      return chat;
    }
    return await this.chatService.getOrCreate(createChatDto, req.user.sub);
  }

  @TrackFavorite('Chat')
  @Get('/', { response: PaginatedChatsDto, status: HttpStatus.OK })
  async findAll(
    @Query() query: ChatQueryDto,
    @Req() req: Express.Request,
  ): Promise<PaginatedChatsDto> {
    const [chats, count] = await this.chatService.findAll(
      query,
      req.user.roles.includes(Role.SUPER_ADMIN) ? query.user_id : req.user.sub,
    );
    return new PaginatedChatsDto(chats, count, query);
  }

  @TrackFavorite('Chat')
  @Get(':id', { response: Chat, status: HttpStatus.OK })
  async findOne(@Param('id') id: string, @Req() req: Express.Request): Promise<Chat> {
    const chat = await this.chatService.findOne(id);

    // Allow public access to public chats
    if (chat.is_public && chat.type === ChatType.PUBLIC) {
      return chat;
    }

    // For private chats, require authentication and membership
    if (!req.user) {
      throw new UnauthorizedException('Authentication required for private chats');
    }

    await this.authorize(
      req.user.roles.includes(Role.STANDARD_USER)
        ? chat.members.some((member) => member._id.toString() === req.user.sub)
        : true,
    );
    return chat;
  }

  @TrackFavorite('Chat')
  @Patch(':id', { response: Chat, status: HttpStatus.OK })
  async update(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
    @Req() req: Express.Request,
  ): Promise<Chat> {
    const chat = await this.chatService.findOne(id);
    await this.authorize(chat.admins.some((admin) => admin._id.toString() === req.user.sub));
    return await this.chatService.update(id, updateChatDto);
  }

  @Delete(':id', { response: Chat, status: HttpStatus.OK })
  async remove(@Param('id') id: string, @Req() req: Express.Request): Promise<Chat> {
    const chat = await this.chatService.findOne(id);
    await this.authorize(
      this.and(
        chat.admins.some((admin) => admin._id.toString() === req.user.sub),
        chat.members.length === 1,
      ),
    );
    return await this.chatService.remove(id);
  }
}
