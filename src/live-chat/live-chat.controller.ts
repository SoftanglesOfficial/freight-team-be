import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { LiveChatService } from './live-chat.service';
import { CreateLiveChatDto } from './dto/create-live-chat.dto';
import { UpdateLiveChatDto } from './dto/update-live-chat.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { LiveChatMessageForAdminDto, LiveChatMessageForUserDto } from './dto/live-chat-message.dto';
import { Role, Roles } from 'src/roles/roles.decorator';
import { ApiResponse } from '@nestjs/swagger';
import { LiveChat } from './entities/live-chat.entity';
import { LiveChatMessage } from './entities/live-chat-message.entity';

@Roles(Role.SUPER_ADMIN)
@Controller('live-chat')
export class LiveChatController {
  constructor(private readonly liveChatService: LiveChatService) {}

  @ApiResponse({ type: LiveChat, status: 201 })
  @Public()
  @Post()
  create(@Body() createLiveChatDto: CreateLiveChatDto) {
    return this.liveChatService.create(createLiveChatDto);
  }

  @ApiResponse({ type: [LiveChat], status: 200 })
  @Get()
  findAll(@Req() req: any) {
    const is_archived = req.query.archived === 'true';
    return this.liveChatService.findAll({ is_archived });
  }

  @ApiResponse({ type: Number, status: 200 })
  @Get('stats/total-unread')
  getTotalUnreadForAdmin() {
    return this.liveChatService.getTotalUnreadForAdmin();
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Public()
  @Get('anon/:anonId')
  findByAnonId(@Param('anonId') anonId: string) {
    return this.liveChatService.findByAnonId(anonId);
  }

  @ApiResponse({ type: [LiveChatMessage], status: 200 })
  @Public()
  @Get('anon/:anonId/messages')
  getMessagesByAnonId(@Param('anonId') anonId: string) {
    return this.liveChatService.getMessagesByAnonId(anonId);
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.liveChatService.findOne(id);
  }

  @ApiResponse({ type: [LiveChatMessage], status: 200 })
  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.liveChatService.getMessages(id);
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLiveChatDto: UpdateLiveChatDto) {
    return this.liveChatService.update(id, updateLiveChatDto);
  }

  @ApiResponse({ type: LiveChatMessage, status: 201 })
  @Public()
  @Post(':id/msg-to-admin')
  messageToAdmin(@Param('id') id: string, @Body() dto: LiveChatMessageForAdminDto) {
    return this.liveChatService.message(id, dto);
  }

  @ApiResponse({ type: LiveChatMessage, status: 201 })
  @Post(':id/msg-to-user')
  messageToUser(
    @Param('id') id: string,
    @Body() dto: LiveChatMessageForUserDto,
    @Req() req: Express.Request,
  ) {
    return this.liveChatService.message(id, {
      message: dto.message,
      sender_id: req.user.sub,
    });
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Public()
  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.liveChatService.update(id, { is_archived: true });
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Patch(':id/seen')
  markAsSeenByAdmin(@Param('id') id: string) {
    return this.liveChatService.markAsSeen(id, 'admin');
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Public()
  @Patch(':id/seen-by-user')
  markAsSeenByUser(@Param('id') id: string) {
    return this.liveChatService.markAsSeen(id, 'user');
  }

  @ApiResponse({ type: LiveChat, status: 200 })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.liveChatService.remove(id);
  }
}
