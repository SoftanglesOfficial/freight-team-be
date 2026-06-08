import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument, ChatType } from './entities/chat.entity';
import { FilterQuery, Model, Types } from 'mongoose';
import { ChatQueryDto } from './dto/chat-query.dto';
import { FavoriteService } from 'src/favorite/favorite.service';
import { ChatMessage } from './entities/chat-message.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatCreatedAction } from './actions/chat-created.action';
import { ACTION_EVENT } from 'src/common/class/action.class';
import { ChatUpdatedAction } from './actions/chat-updated.action';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { RequestContextService } from 'src/request-context/request-context.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private readonly favoriteService: FavoriteService,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
  ) {}

  async getOrCreate(createChatDto: CreateChatDto, creatorId: string): Promise<Chat> {
    let chat = await this.findOneByOnlyMembers([
      ...createChatDto.members.map((member) => member.toString()),
    ]);
    if (chat) {
      return chat;
    }
    chat = await this.chatModel.create({
      members: [...createChatDto.members, creatorId],
      admins: [creatorId],
      type: createChatDto.type,
    });
    const newChat = await this.findOne(chat._id.toString());
    await this.eventEmitter.emitAsync(
      ACTION_EVENT,
      new ChatCreatedAction(this.requestContext.getUser(), newChat),
    );
    return newChat;
  }

  async findAll(query: Omit<ChatQueryDto, 'user_id'>, userId?: string): Promise<[Chat[], number]> {
    const filter: FilterQuery<Chat> = {};
    if (userId) {
      filter.members = { $in: [userId] };
    }
    if (query.is_favorite !== undefined) {
      if (userId) {
        const favorites = await this.favoriteService.findAllByUserAndResource(userId, 'Chat');
        if (query.is_favorite === true) {
          filter._id = { $in: favorites.map((favorite) => favorite.resource) };
        } else if (query.is_favorite === false) {
          filter._id = { $nin: favorites.map((favorite) => favorite.resource) };
        }
      }
    }
    const chats = await this.chatModel
      .find(filter)
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .sort({ last_message_at: -1 })
      .skip(query.skip)
      .limit(query.pageSize);

    const count = await this.chatModel.countDocuments(filter);
    return [chats, count];
  }

  async findOneByOnlyMembers(members: string[]): Promise<Chat | null> {
    const foundChat = await this.chatModel
      .findOne({ members: { $all: members }, type: ChatType.DIRECT })
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ]);

    if (!foundChat) {
      return null;
    }
    return foundChat;
  }

  async findOrCreatePublicChat(roomName: string): Promise<Chat> {
    let publicChat = await this.chatModel.findOne({
      type: ChatType.PUBLIC,
      public_room_name: roomName,
      is_public: true,
    });

    if (!publicChat) {
      publicChat = await this.chatModel.create({
        type: ChatType.PUBLIC,
        is_public: true,
        public_room_name: roomName,
        name: `Public Chat: ${roomName}`,
        members: [],
        admins: [],
        max_participants: 100, // Default max participants
      });

      const newChat = await this.findOne(publicChat._id.toString());
      await this.eventEmitter.emitAsync(
        'action',
        new ChatCreatedAction(this.requestContext.getUser(), newChat),
      );
      return newChat;
    }

    return this.findOne(publicChat._id.toString());
  }

  async getPublicChats(): Promise<Chat[]> {
    return this.chatModel
      .find({ type: ChatType.PUBLIC, is_public: true })
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .sort({ last_message_at: -1 });
  }

  async findOne(id: string): Promise<Chat> {
    return this.chatModel
      .findById(id)
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .orFail(new NotFoundException('Chat not found'));
  }

  async update(id: string, updateChatDto: UpdateChatDto): Promise<Chat> {
    const updatedChat = await this.chatModel
      .findByIdAndUpdate(id, updateChatDto, { new: true })
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .orFail(new NotFoundException('Chat not found'));
    await this.eventEmitter.emitAsync(
      ACTION_EVENT,
      new ChatUpdatedAction(this.requestContext.getUser(), updatedChat),
    );
    return updatedChat;
  }

  async updateLastMessage(chatId: string, message: ChatMessage): Promise<Chat> {
    const updatedChat = await this.chatModel
      .findByIdAndUpdate(
        chatId,
        {
          $set: {
            last_message: message._id,
            last_message_at: new Date(),
          },
        },
        { new: true },
      )
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .orFail(new NotFoundException('Chat not found'));
    await this.eventEmitter.emitAsync(
      ACTION_EVENT,
      new ChatUpdatedAction(this.requestContext.getUser(), updatedChat),
    );
    return updatedChat;
  }

  async remove(id: string): Promise<Chat> {
    return this.chatModel
      .findByIdAndDelete(id)
      .populate([
        {
          path: 'members',
          select: 'first_name last_name email',
        },
        {
          path: 'last_message',
          populate: {
            path: 'sender',
            select: 'email first_name last_name',
          },
        },
      ])
      .orFail(new NotFoundException('Chat not found'));
  }

  async getAllMyChatIds(userId: string): Promise<Types.ObjectId[]> {
    const chats = await this.chatModel.find({ members: { $in: [userId] } });
    return chats.map((chat) => chat._id);
  }
}
