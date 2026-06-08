import { Injectable } from '@nestjs/common';
import { LiveChat } from 'src/live-chat/entities/live-chat.entity';
import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Types } from 'mongoose';
import { LIVE_CHAT_EVENTS } from '../live-chat.events';

@Injectable()
export class LiveChatUpdatedAction extends Action<
  {},
  { liveChat: LiveChat; adminIds: string[]; total_unread_for_admin: number }
> {
  build(): IAction {
    return {
      notifications: this.data.adminIds.map((adminId) => {
        return {
          user: new Types.ObjectId(adminId),
          action: ActionType.UPDATE,
          entity: {
            _id: this.data.liveChat._id,
            title: this.data.liveChat.subject,
            type: 'LiveChat',
          },
          message: `Chat updated: ${this.data.liveChat.subject}`,
        };
      }),
      socketEvents: [
        {
          event: LIVE_CHAT_EVENTS.LIVE_CHAT_UPDATED,
          data: {
            ...this.data.liveChat.toJSON(),
            total_unread_for_admin: this.data.total_unread_for_admin,
          },
          recipients: [this.data.liveChat.anon_id, ...this.data.adminIds],
        },
      ],
    };
  }
}
