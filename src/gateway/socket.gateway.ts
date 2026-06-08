import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Notification } from 'src/notification/entities/notification.entity';
import { NotificationService } from 'src/notification/notification.service';
import { JwtService } from '@nestjs/jwt';
import { GATEWAY_ACTIONS } from './gateway.actions';
import { ChatService } from 'src/chat/chat.service';
import { OnEvent } from '@nestjs/event-emitter';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import type { ISocketEvent } from 'src/common/interfaces/socket-event.interface';
import { Action } from 'src/common/class/action.class';
import { ActivityService } from 'src/activity/activity.service';
import { MailerService } from 'src/mailer/mailer.service';
import { UserService } from 'src/user/user.service';
import { Types } from 'mongoose';
import { from } from 'rxjs';

@Injectable()
@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly map = new Map<string, Socket>();
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
    private readonly activityService: ActivityService,
    private readonly chatService: ChatService,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
  ) {}

  @SubscribeMessage('connect')
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Check if this is a public chat connection
      const anon_id = client.handshake.query?.anon_id;
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      // decode token for authenticated connections

      try {
        if (token) {
          const authUser = await this.decodeToken(token);

          // add to socket map
          this.map.set(authUser.sub, client);

          // emit pending notifications
          const notifications = await this.notificationService.findUnseen(authUser.sub);

          this.emitNotifications(notifications);

          // log user connected
          this.logger.log(`User ${authUser.sub} connected`);

          // emit user online status
          this.emitUserStatus(authUser.sub, 'user_online');

          // emit users online to me
          this.map.forEach((_, key) => {
            if (key.toString() !== authUser.sub) {
              client.emit(GATEWAY_ACTIONS.USER_ONLINE, {
                userId: key.toString(),
              });
            }
          });

          // join my chats
          const myChatIds = await this.chatService.getAllMyChatIds(authUser.sub);
          for (const chatId of myChatIds) {
            await client.join(chatId.toString());
          }
        }
      } catch (error) {
        this.logger.error(`Failed to decode token: ${error.message}`);
      }

      if (anon_id) {
        this.logger.log(`Anonymous user ${anon_id.toString()} connected`);
        this.map.set(anon_id.toString(), client);
      }
    } catch (error) {
      this.logger.error(`Failed to establish WebSocket connection: ${error}`);
      client.emit('error', { message: 'Socket connection failed' });
      client.disconnect();
    }
  }

  @SubscribeMessage('disconnect')
  async handleDisconnect(client: Socket): Promise<void> {
    // get user id from socket map
    const userId = this.getUserBySocket(client);

    if (userId) {
      // log user disconnected
      this.logger.log(`User ${userId.toString()} disconnected`);

      // mark user offline
      this.emitUserStatus(userId.toString(), 'user_offline');

      // delete from socket map
      this.map.delete(userId.toString());
    }
  }

  @OnEvent('emit_socket_event')
  private emitSocketEvent(event: ISocketEvent) {
    event.recipients.forEach((recipient) => {
      const socket = this.map.get(recipient.toString());
      if (socket) {
        socket.emit(event.event, event.data);
        this.logger.log(`Socket event ${event.event} dispatched for User ${recipient.toString()}`);
      }
    });
  }

  @OnEvent('emit_socket_events')
  emitSocketEvents(socketEvents: ISocketEvent[]) {
    socketEvents.forEach((socketEvent) => {
      socketEvent.recipients.forEach((recipient) => {
        const socket = this.map.get(recipient.toString());
        if (socket) {
          socket.emit(socketEvent.event, socketEvent.data);
          this.logger.log(
            `Socket event ${socketEvent.event} dispatched for User ${recipient.toString()}`,
          );
        }
      });
    });
  }

  @OnEvent('emit_notifications')
  private emitNotifications([notifications, count]: [Notification[], number]) {
    notifications.forEach((notification) => {
      const socket = this.map.get(notification.user.toString());
      if (socket) {
        socket.emit(GATEWAY_ACTIONS.NEW_NOTIFICATION, notification);
        socket.emit(GATEWAY_ACTIONS.NOTIFICATION_COUNT_UPDATE, count);
        this.logger.log(
          `Notification ${notification._id.toString()} dispatched for User ${notification.user.toString()}`,
        );
      }
    });
  }

  @OnEvent('action')
  private async action<T, D>(event: Action<T, D>) {
    let { activity, notifications, emails, socketEvents: socketEvents } = await event.build();
    if (activity) {
      await this.activityService.create({
        ...activity,
        user_id: activity.user._id,
      });
    }
    if (emails && emails.length > 0) {
      const adminCc = await this.userService.findAdminEmails();
      emails = emails.map((email) => ({
        ...email,
        cc: email.adminCc ? [...(email.cc ?? []), ...adminCc] : email.cc,
      }));
      await this.mailerService.dispatch(...emails);
    }
    if (notifications && notifications.length > 0) {
      const createdNotifications = await this.notificationService.create(notifications);
      this.emitNotifications(createdNotifications);
    }
    if (socketEvents && socketEvents.length > 0) {
      this.emitSocketEvents(socketEvents);
    }
  }

  private async decodeToken(token: string): Promise<RequestUser> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      this.logger.error(`Error decoding token: ${error}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private getRelatedSockets(userId: string, onlineUsers: string[]): Socket[] {
    return Array.from(this.map.values()).filter(() => onlineUsers.includes(userId));
  }

  private getUserBySocket(socket: Socket): string | undefined {
    return Array.from(this.map.keys()).find((key) => this.map.get(key) === socket);
  }

  private async handlePublicChatConnection(client: Socket, roomName: string): Promise<void> {
    try {
      // Generate anonymous user ID if not provided
      const anonymousUserId =
        (client.handshake.query?.anonymous_user_id as string) ||
        `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Find or create the public chat room
      const publicChat = await this.chatService.findOrCreatePublicChat(roomName);

      // Join the public chat room
      await client.join(publicChat._id.toString());

      // Store anonymous user mapping (you might want to use a separate map for anonymous users)
      this.map.set(anonymousUserId, client);

      // Emit welcome message or room info
      client.emit('public_chat_joined', {
        chat: publicChat,
        anonymous_user_id: anonymousUserId,
        room_name: roomName,
      });
    } catch (error) {
      this.logger.error(`Failed to handle public chat connection: ${error.message}`);
      client.emit('error', { message: 'Failed to join public chat' });
      client.disconnect();
    }
  }

  private async emitUserStatus(userId: string, status: 'user_online' | 'user_offline') {
    this.map.forEach((socket, key) => {
      if (key.toString() !== userId) {
        socket.emit(status, {
          userId,
        });
      }
    });
    // mark user online
    if (Types.ObjectId.isValid(userId)) {
      await this.userService.markUserStatus(userId, status);
    }
  }
}
