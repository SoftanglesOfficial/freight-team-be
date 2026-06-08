import { Injectable } from '@nestjs/common';
import { LiveChat } from 'src/live-chat/entities/live-chat.entity';
import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Types } from 'mongoose';
import { LIVE_CHAT_EVENTS } from '../live-chat.events';
import { LiveChatMessage } from '../entities/live-chat-message.entity';

@Injectable()
export class LiveChatMessageAction extends Action<
  { actorId: string },
  { liveChatMsg: LiveChatMessage; liveChat: LiveChat; adminIds: string[] }
> {
  build(): IAction {
    const recipients = [...this.data.adminIds, this.data.liveChat.anon_id].filter(
      (id) => id !== this.actor.actorId,
    );
    return {
      // notifications: recipients.map((adminId) => {
      //   return {
      //     user: new Types.ObjectId(adminId),
      //     action: ActionType.CREATE,
      //     entity: {
      //       _id: this.data.liveChatMsg.chat_id,
      //       title: this.data.liveChatMsg.message,
      //       type: LiveChatMessage.name,
      //     },
      //     message: `New message received for chat ${this.data.liveChat.subject}`,
      //   };
      // }),
      socketEvents: [
        {
          event: LIVE_CHAT_EVENTS.LIVE_CHAT_MESSAGE,
          data: this.data.liveChatMsg,
          recipients,
        },
      ],
    };
  }
}
