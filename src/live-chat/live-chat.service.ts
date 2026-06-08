import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLiveChatDto } from './dto/create-live-chat.dto';
import { UpdateLiveChatDto } from './dto/update-live-chat.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LiveChat, UnreadStats } from './entities/live-chat.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISocketEvent } from 'src/common/interfaces/socket-event.interface';
import { UserService } from 'src/user/user.service';
import { LiveChatMessage } from './entities/live-chat-message.entity';
import { ACTION_EVENT } from 'src/common/class/action.class';
import { LiveChatMessageAction } from './actions/live-chat-message.action';
import { LiveChatUpdatedAction } from './actions/live-chat-updated.action';

@Injectable()
export class LiveChatService {
  constructor(
    @InjectModel('LiveChat')
    private liveChatModel: Model<LiveChat>,
    @InjectModel('LiveChatMessage')
    private liveChatMessageModel: Model<LiveChatMessage>,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
  ) {}

  async create(createLiveChatDto: CreateLiveChatDto) {
    // Close any existing active chat for this anon_id
    const existing = await this.liveChatModel.findOne({
      anon_id: createLiveChatDto.anon_id,
      is_archived: false,
    });
    if (existing) {
      await this.liveChatModel.updateOne({ _id: existing._id }, { is_archived: true });
    }

    // Always create a new chat
    const chat = await this.liveChatModel.create(createLiveChatDto);

    const adminIds = await this.userService.findAllAdminIds();
    const event: ISocketEvent = {
      event: 'live_chat_created',
      data: chat,
      recipients: [chat.anon_id, ...adminIds],
    };
    this.eventEmitter.emit('emit_socket_event', event);
    return chat;
  }

  findAll(filter?: { is_archived?: boolean }) {
    const query: any = {};
    if (filter && typeof filter.is_archived === 'boolean') {
      query.is_archived = filter.is_archived;
    } else {
      query.is_archived = false;
    }
    return this.liveChatModel.find(query);
  }

  findOne(id: string) {
    return this.liveChatModel
      .findOne({ _id: new Types.ObjectId(id) })
      .orFail(new NotFoundException(`LiveChat with id ${id} not found`));
  }

  async findByAnonId(anonId: string) {
    return this.liveChatModel.findOne({
      anon_id: anonId,
      is_archived: false,
    });
  }

  async update(id: string, updateLiveChatDto: UpdateLiveChatDto & { unread_stats?: UnreadStats }) {
    const chat = await this.liveChatModel
      .findOneAndUpdate({ _id: new Types.ObjectId(id) }, updateLiveChatDto, {
        new: true,
      })
      .orFail(new NotFoundException(`LiveChat with id ${id} not found`));
    const adminIds = await this.userService.findAllAdminIds();
    const total_unread_for_admin = await this.getTotalUnreadForAdmin();
    this.eventEmitter.emit(
      ACTION_EVENT,
      new LiveChatUpdatedAction({}, { liveChat: chat, adminIds, total_unread_for_admin }),
    );
    return chat;
  }

  async message(id: string, dto: { message: string; sender_id: string }) {
    const chat = await this.liveChatModel.findOne({
      _id: new Types.ObjectId(id),
      is_archived: false,
    });
    if (!chat) {
      throw new NotFoundException(`No active chat found with id ${id}`);
    }
    const message = await this.liveChatMessageModel.create({
      message: dto.message,
      sender_id: dto.sender_id,
      chat_id: new Types.ObjectId(id),
    });
    const adminIds = await this.userService.findAllAdminIds();
    this.eventEmitter.emit(
      ACTION_EVENT,
      new LiveChatMessageAction(
        { actorId: dto.sender_id },
        { liveChatMsg: message, liveChat: chat, adminIds },
      ),
    );
    await this.syncUnreadStats(chat);
    return message;
  }

  async syncUnreadStats(chat: LiveChat) {
    const for_admins = await this.liveChatMessageModel.countDocuments({
      chat_id: chat._id,
      sender_id: chat.anon_id,
      seen: false,
    });
    const for_user = await this.liveChatMessageModel.countDocuments({
      chat_id: chat._id,
      sender_id: { $ne: chat.anon_id },
      seen: false,
    });
    await this.update(chat._id.toString(), {
      unread_stats: {
        for_admins,
        for_user,
      },
    });
  }

  async remove(id: string) {
    const objectId = new Types.ObjectId(id);
    // Delete all messages associated with this chat
    await this.liveChatMessageModel.deleteMany({ chat_id: objectId });

    // Delete the chat itself
    return this.liveChatModel
      .findOneAndDelete({ _id: objectId })
      .orFail(new NotFoundException(`LiveChat with id ${id} not found`));
  }

  async getMessages(chatId: string) {
    return this.liveChatMessageModel
      .find({ chat_id: new Types.ObjectId(chatId) })
      .sort({ createdAt: 1 });
  }

  async getMessagesByAnonId(anonId: string) {
    const chat = await this.liveChatModel.findOne({
      anon_id: anonId,
      is_archived: false,
    });
    if (!chat) {
      return [];
    }
    return this.liveChatMessageModel.find({ chat_id: chat._id }).sort({ createdAt: 1 });
  }

  async markAsSeen(id: string, viewerRole: 'admin' | 'user') {
    const chat = await this.findOne(id);
    const filter: any = { chat_id: chat._id, seen: false };

    if (viewerRole === 'admin') {
      filter.sender_id = chat.anon_id;
    } else {
      filter.sender_id = { $ne: chat.anon_id };
    }

    await this.liveChatMessageModel.updateMany(filter, { seen: true });
    await this.syncUnreadStats(chat);
    return chat;
  }

  async getTotalUnreadForAdmin() {
    const result = await this.liveChatModel.aggregate([
      { $match: { is_archived: false } },
      { $group: { _id: null, total: { $sum: '$unread_stats.for_admins' } } },
    ]);
    return result[0]?.total || 0;
  }
}
