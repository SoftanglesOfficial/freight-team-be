import { LiveChat } from 'src/live-chat/entities/live-chat.entity';
import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { HtmlBuilder } from 'src/common/class/html-builder.class';
import { Types } from 'mongoose';
import { LIVE_CHAT_EVENTS } from '../live-chat.events';

export class LiveChatCreatedAction extends Action<{}, { liveChat: LiveChat; adminIds: string[] }> {
  build(): IAction {
    const htmlBuilder = new HtmlBuilder();

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
      emails: [
        {
          adminCc: false,
          to: 'sales@ftlwarehouse.com',
          subject: `New Live Chat – ${this.data.liveChat.user_name}`,
          html: htmlBuilder
            .hello('Team')
            .line(`A visitor has opened a new live chat on the website.`)
            .divider()
            .heading(3, 'Chat Details')
            .list([
              `<b>Name:</b> ${this.data.liveChat.user_name}`,
              `<b>Email:</b> ${this.data.liveChat.user_email || 'Not provided'}`,
              `<b>Subject:</b> ${this.data.liveChat.subject || 'No subject'}`,
            ])
            .divider()
            .line(
              `👉 <a href="https://freightteamlogistics.com/admin/livechat" style="color:#FF6B35;font-weight:500;text-decoration:none;">Open Live Chat Panel</a>`,
            )
            .build(),
        },
      ],
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
