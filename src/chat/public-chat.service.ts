import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreatePublicChatMessageDto } from './dto/create-public-chat-message.dto';
import { JoinPublicChatDto } from './dto/join-public-chat.dto';
import { ChatService } from './chat.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatMessageCreatedAction } from './actions/chat-message-created.action';
import { v4 as uuidv4 } from 'uuid';
import { ApiProperty } from '@nestjs/swagger';

export class AnonymousUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  joined_at: Date;

  @ApiProperty()
  last_activity: Date;
}

@Injectable()
export class PublicChatService {
  private anonymousUsers = new Map<string, AnonymousUser>();

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async joinPublicChat(
    joinDto: JoinPublicChatDto,
  ): Promise<{ chat: Chat; anonymous_user: AnonymousUser }> {
    const chat = await this.chatService.findOrCreatePublicChat(joinDto.room_name);

    // Create or get anonymous user
    const anonymousUser = this.getOrCreateAnonymousUser(
      joinDto.anonymous_user_id,
      joinDto.display_name,
    );

    // Check participant limit
    if (
      chat.max_participants &&
      this.getActiveParticipants(chat._id.toString()).length >= chat.max_participants
    ) {
      throw new BadRequestException('Chat room is full');
    }

    return { chat, anonymous_user: anonymousUser };
  }

  async sendPublicMessage(
    chatId: string,
    messageDto: CreatePublicChatMessageDto,
  ): Promise<ChatMessage> {
    const chat = await this.chatService.findOne(chatId);

    if (!chat.is_public || chat.type !== ChatType.PUBLIC) {
      throw new BadRequestException('This is not a public chat');
    }

    // Validate anonymous user
    if (!messageDto.anonymous_user_id) {
      throw new BadRequestException('Anonymous user ID is required');
    }

    const anonymousUser = this.getAnonymousUser(messageDto.anonymous_user_id);
    if (!anonymousUser) {
      throw new BadRequestException('Anonymous user not found. Please join the chat first.');
    }

    // Update user activity
    this.updateUserActivity(messageDto.anonymous_user_id);

    // Create a temporary user-like object for the anonymous user
    const tempUser = {
      _id: messageDto.anonymous_user_id,
      sub: messageDto.anonymous_user_id,
      first_name: anonymousUser.display_name,
      last_name: '(Anonymous)',
      email: `${messageDto.anonymous_user_id}@anonymous.local`,
    };

    // Create the message
    const newMessage = await this.chatMessageModel.create({
      content: messageDto.content,
      chat: new Types.ObjectId(chatId),
      sender: new Types.ObjectId(messageDto.anonymous_user_id),
      // For public chats, we don't track seen_by as strictly
      seen_by: [],
      delivered_to: [],
    });

    const updatedChat = await this.chatService.updateLastMessage(chatId, newMessage);

    const populatedMessage = await this.chatMessageModel.findById(newMessage._id).populate([
      {
        path: 'sender',
        select: '_id first_name last_name email',
      },
    ]);

    if (!populatedMessage) {
      throw new BadRequestException('Failed to create message');
    }

    // Emit the message event with anonymous user context
    await this.eventEmitter.emitAsync(
      'action',
      new ChatMessageCreatedAction(tempUser as any, {
        chat: updatedChat,
        message: populatedMessage,
      }),
    );

    return populatedMessage;
  }

  async getPublicChatMessages(chatId: string, limit: number = 50): Promise<ChatMessage[]> {
    const chat = await this.chatService.findOne(chatId);

    if (!chat.is_public || chat.type !== ChatType.PUBLIC) {
      throw new BadRequestException('This is not a public chat');
    }

    const messages = await this.chatMessageModel
      .find({ chat: new Types.ObjectId(chatId) })
      .populate([
        {
          path: 'sender',
          select: '_id first_name last_name email',
        },
      ])
      .sort({ createdAt: -1 })
      .limit(limit);

    return messages.reverse();
  }

  getActiveParticipants(chatId: string): AnonymousUser[] {
    // In a real implementation, you'd track which users are in which rooms
    // For now, return recent active users
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    return Array.from(this.anonymousUsers.values()).filter(
      (user) => user.last_activity > fiveMinutesAgo,
    );
  }

  private getOrCreateAnonymousUser(userId?: string, displayName?: string): AnonymousUser {
    const id = userId || uuidv4();
    const name = displayName || `Anonymous-${id.slice(0, 8)}`;

    let user = this.anonymousUsers.get(id);
    if (!user) {
      user = {
        id,
        display_name: name,
        joined_at: new Date(),
        last_activity: new Date(),
      };
      this.anonymousUsers.set(id, user);
    }

    return user;
  }

  private getAnonymousUser(userId: string): AnonymousUser | undefined {
    return this.anonymousUsers.get(userId);
  }

  private updateUserActivity(userId: string): void {
    const user = this.anonymousUsers.get(userId);
    if (user) {
      user.last_activity = new Date();
    }
  }

  // Clean up inactive anonymous users (call this periodically)
  cleanupInactiveUsers(): void {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    for (const [userId, user] of this.anonymousUsers.entries()) {
      if (user.last_activity < thirtyMinutesAgo) {
        this.anonymousUsers.delete(userId);
      }
    }
  }
}
