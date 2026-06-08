import { Injectable } from '@nestjs/common';
import { LiveChat } from 'src/live-chat/entities/live-chat.entity';
import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Types } from 'mongoose';
import { LIVE_CHAT_EVENTS } from '../live-chat.events';

@Injectable()
export class LiveChatCreatedAction extends Action<{}, { liveChat: LiveChat; adminIds: string[] }> {
  build(): IAction {
    return {
      notifications: this.data.adminIds.map((adminId) => {
        return {
          user: new Types.ObjectId(adminId),
          action: ActionType.CREATE,
          entity: {
            _id: this.data.liveChat._id,
            title: this.data.liveChat.subject,
            type: 'LiveChat',
          },
          message: `New chat from ${this.data.liveChat.user_name}`,
        };
      }),
      socketEvents: [
        {
          event: LIVE_CHAT_EVENTS.LIVE_CHAT_CREATED,
          data: this.data.liveChat,
          recipients: [this.data.liveChat.anon_id, ...this.data.adminIds],
        },
      ],
    };
  }
}
