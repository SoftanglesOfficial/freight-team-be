import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { CHAT_EVENTS } from '../chat.events';
import { Action, IAction } from 'src/common/class/action.class';
import { ChatMessage } from '../entities/chat-message.entity';
import { Chat } from '../entities/chat.entity';

export class ChatMessageSeenAction extends Action<
  RequestUser,
  { chat: Chat; message: ChatMessage }
> {
  constructor(subject: RequestUser, data: { chat: Chat; message: ChatMessage }) {
    super(subject, data);
  }

  build(): IAction {
    const { chat, message } = this.data;
    const members = chat.members;
    const otherMembers = members.filter((member) => member._id.toString() !== this.actor.sub);

    return {
      socketEvents: [
        {
          event: CHAT_EVENTS.CHAT_MESSAGE_SEEN,
          data: message,
          recipients: otherMembers.map((member) => member._id.toString()),
        },
      ],
    };
  }
}
