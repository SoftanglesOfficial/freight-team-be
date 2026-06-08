import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from './entities/chat-message.entity';
import { FilterQuery, Model, Types } from 'mongoose';
import { ChatMessageQueryDto } from './dto/chat-message-query.dto';
import { Chat } from './entities/chat.entity';
import { ChatStatsDto } from './dto/chat-stats.dto';
import { User } from 'src/user/entities/user.entity';
import { ChatService } from './chat.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatMessageCreatedAction } from './actions/chat-message-created.action';
import { ChatMessageSeenAction } from './actions/chat-message-seen.action';
import { ChatMessageDeletedAction } from './actions/chat-message-deleted.action';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { RequestContextService } from 'src/request-context/request-context.service';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
  ) {}

  async create(chatId: string, createChatMessageDto: CreateChatMessageDto): Promise<ChatMessage> {
    const requestUser = this.requestContext.getUser();
    const newMessage = await this.chatMessageModel.create({
      ...createChatMessageDto,
      chat: new Types.ObjectId(chatId),
      sender: new Types.ObjectId(requestUser.sub),
    });
    const chat = await this.chatService.updateLastMessage(chatId, newMessage);
    // await message.populate([
    //   {
    //     path: 'sender',
    //     select: '_id first_name last_name email',
    //   },
    //   {
    //     path: 'seen_by',
    //     select: '_id first_name last_name email',
    //   },
    //   {
    //     path: 'delivered_to',
    //     select: '_id first_name last_name email',
    //   },
    //   {
    //     path: 'chat',
    //     populate: [
    //       { path: 'members', select: '_id first_name last_name email' },
    //       {
    //         path: 'last_message',
    //         populate: {
    //           path: 'sender',
    //           select: '_id first_name last_name email',
    //         },
    //       },
    //     ],
    //   },
    // ]);
    const message = await this.findOne(newMessage._id.toString());
    await this.eventEmitter.emitAsync(
      'action',
      new ChatMessageCreatedAction(this.requestContext.getUser(), { chat, message }),
    );
    return message;
  }

  async findAll(chatId: string, query: ChatMessageQueryDto): Promise<[ChatMessage[], number]> {
    const filter: FilterQuery<ChatMessage> = {
      chat: new Types.ObjectId(chatId),
      ...(query.search ? { content: { $regex: query.search, $options: 'i' } } : {}),
    };

    const messages = await this.chatMessageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate([
        {
          path: 'sender',
          select: '_id first_name last_name email',
        },
        {
          path: 'seen_by',
          select: '_id first_name last_name email',
        },
        {
          path: 'delivered_to',
          select: '_id first_name last_name email',
        },
      ])
      .skip(query.skip)
      .limit(query.pageSize);
    const count = await this.chatMessageModel.countDocuments(filter);
    return [messages, count];
  }

  async findOne(id: string): Promise<ChatMessage> {
    return this.chatMessageModel
      .findById(id)
      .populate([
        {
          path: 'sender',
          select: '_id first_name last_name email',
        },
        {
          path: 'seen_by',
          select: '_id first_name last_name email',
        },
        {
          path: 'delivered_to',
          select: '_id first_name last_name email',
        },
        // {
        //   path: 'chat',
        //   populate: [
        //     { path: 'members', select: '_id first_name last_name email' },
        //     {
        //       path: 'last_message',
        //       populate: {
        //         path: 'sender',
        //         select: '_id first_name last_name email',
        //       },
        //     },
        //   ],
        // },
      ])
      .orFail(new NotFoundException('Chat message not found'));
  }

  async markAsSeen(id: string, userId: string): Promise<ChatMessage> {
    let message = await this.chatMessageModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $addToSet: { seen_by: new Types.ObjectId(userId) } },
        { new: true },
      )
      .populate([
        {
          path: 'sender',
          select: '_id first_name last_name email',
        },
        {
          path: 'seen_by',
          select: '_id first_name last_name email',
        },
        {
          path: 'delivered_to',
          select: '_id first_name last_name email',
        },
        // {
        //   path: 'chat',
        //   populate: [
        //     { path: 'members', select: '_id first_name last_name email' },
        //     {
        //       path: 'last_message',
        //       populate: {
        //         path: 'sender',
        //         select: '_id first_name last_name email',
        //       },
        //     },
        //   ],
        // },
      ])
      .orFail(new NotFoundException('Chat message not found'));
    const chat = await this.chatService.findOne(message.chat.toString());
    const memberIds = chat.members.filter(
      (user: User) => user._id.toString() !== message.sender._id.toString(),
    );

    const allSeen = message.seen_by.length === memberIds.length;

    if (allSeen) {
      message = await this.chatMessageModel
        .findByIdAndUpdate(new Types.ObjectId(id), { $set: { seen: true } }, { new: true })
        .populate([
          {
            path: 'sender',
            select: '_id first_name last_name email',
          },
          {
            path: 'seen_by',
            select: '_id first_name last_name email',
          },
          {
            path: 'delivered_to',
            select: '_id first_name last_name email',
          },
          // {
          //   path: 'chat',
          //   populate: [
          //     { path: 'members', select: '_id first_name last_name email' },
          //     {
          //       path: 'last_message',
          //       populate: {
          //         path: 'sender',
          //         select: '_id first_name last_name email',
          //       },
          //     },
          //   ],
          // },
        ])
        .orFail(new NotFoundException('Chat message not found'));
    }
    await this.eventEmitter.emitAsync(
      'action',
      new ChatMessageSeenAction(this.requestContext.getUser(), { chat, message }),
    );
    return message;
  }

  async remove(id: string): Promise<ChatMessage> {
    const message = await this.chatMessageModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException('Chat message not found'));
    const chat = await this.chatService.findOne(message.chat.toString());
    await this.eventEmitter.emitAsync(
      'action',
      new ChatMessageDeletedAction(this.requestContext.getUser(), { chat, message }),
    );
    return message;
  }

  async getUnreadStats(userId: string): Promise<ChatStatsDto> {
    const res = await this.chatMessageModel.aggregate([
      {
        $lookup: {
          from: 'chats',
          localField: 'chat',
          foreignField: '_id',
          as: 'chat',
        },
      },
      { $unwind: '$chat' },
      {
        $match: {
          'chat.members': { $in: [new Types.ObjectId(userId)] },
          sender: { $ne: new Types.ObjectId(userId) },
          seen_by: { $nin: [new Types.ObjectId(userId)] },
        },
      },
      { $unwind: '$chat' },
      {
        $match: {
          'chat.members': { $in: [new Types.ObjectId(userId)] },
          sender: { $ne: new Types.ObjectId(userId) },
          seen_by: { $nin: [new Types.ObjectId(userId)] },
        },
      },
      {
        $group: {
          _id: '$chat._id',
          unread: { $sum: 1 },
        },
      },
      {
        $project: {
          chatId: '$_id',
          unread: 1,
        },
      },
    ]);
    return {
      total_unread_chats: res.length,
      chat_unread_messages: res.map((result: { chatId: Types.ObjectId; unread: number }) => ({
        total_unread_messages: result.unread,
        chat_id: result.chatId.toString(),
      })),
    };
  }

  // async getUnreadChatsCount(userId: string): Promise<UnreadChatsCount> {
  //   const results = await this.chatMessageModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'chats',
  //         localField: 'chat',
  //         foreignField: '_id',
  //         as: 'chat',
  //       },
  //     },
  //     { $unwind: '$chat' },
  //     {
  //       $match: {
  //         'chat.members': { $in: [new Types.ObjectId(userId)] },
  //         sender: { $ne: new Types.ObjectId(userId) },
  //         seen_by: { $nin: [new Types.ObjectId(userId)] },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: '$chat._id',
  //       },
  //     },
  //   ]);
  //   return {
  //     count: results.length,
  //   };
  // }

  // async getUnreadChatMessagesCount(chatId: Types.ObjectId, userId: string): Promise<unread_chats> {
  //   const results: { unread: number }[] = await this.chatMessageModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'chats',
  //         localField: 'chat',
  //         foreignField: '_id',
  //         as: 'chat',
  //       },
  //     },
  //     { $unwind: '$chat' },
  //     {
  //       $match: {
  //         'chat._id': chatId,
  //         'chat.members': { $in: [new Types.ObjectId(userId)] },
  //         sender: { $ne: new Types.ObjectId(userId) },
  //         seen_by: { $nin: [new Types.ObjectId(userId)] },
  //       },
  //     },
  //     { $count: 'unread' },
  //   ]);
  //   return {
  //     count: results[0]?.unread || 0,
  //     chat_id: chatId.toString(),
  //   };
  // }
}
