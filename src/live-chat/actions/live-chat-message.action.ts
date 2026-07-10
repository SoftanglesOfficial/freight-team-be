import { Injectable } from '@nestjs/common';
import { LiveChat } from 'src/live-chat/entities/live-chat.entity';
import { Action, IAction } from 'src/common/class/action.class';
import { HtmlBuilder } from 'src/common/class/html-builder.class';
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

    const htmlBuilder = new HtmlBuilder();
    const senderName = this.data.liveChat.user_name || 'Customer';
    const message = this.data.liveChatMsg.message || '';
    const isFromCustomer = this.data.liveChatMsg.sender_id === this.data.liveChat.anon_id;

    return {
      notifications: [],
      socketEvents: [
        {
          event: LIVE_CHAT_EVENTS.LIVE_CHAT_MESSAGE,
          data: this.data.liveChatMsg,
          recipients,
        },
      ],
      emails: isFromCustomer
        ? [
            {
              adminCc: false,
              to: 'sales@ftlwarehouse.com',
              subject: `New Chat Message from ${senderName}`,
              html: htmlBuilder
                .hello('Team')
                .line(`You have a new message from <b>${senderName}</b> in the live chat.`)
                .divider()
                .heading(3, 'Message')
                .line(
                  `<blockquote style="border-left:4px solid #293674;padding:12px 16px;margin:8px 0;background:#f0f4ff;border-radius:0 8px 8px 0;font-size:15px;color:#1a1a1a;">${message}</blockquote>`,
                )
                .divider()
                .line(
                  `👉 <a href="https://freightteamlogistics.com/admin/live-chat" style="color:#FF6B35;font-weight:500;text-decoration:none;">Reply in Admin Panel</a>`,
                )
                .build(),
            },
          ]
        : [],
    };
  }
}
