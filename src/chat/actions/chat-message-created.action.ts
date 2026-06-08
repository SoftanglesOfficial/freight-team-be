import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { ChatMessage } from '../entities/chat-message.entity';
import { Types } from 'mongoose';
import { CHAT_EVENTS } from '../chat.events';
import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Chat } from '../entities/chat.entity';

export class ChatMessageCreatedAction extends Action<
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
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.CREATE,
        entity: {
          type: ChatMessage.name,
          _id: message._id,
          title: message.content as string,
        },
        message: `${this.actor.name} sent a message`,
      },
      notifications: otherMembers.map((member) => ({
        message: `${this.actor.name} sent a message`,
        user: member._id,
        action: ActionType.CREATE,
        entity: {
          type: ChatMessage.name,
          _id: message._id,
          title: message.content as string,
        },
      })),
      emails: [],
      socketEvents: [
        {
          event: CHAT_EVENTS.CHAT_MESSAGE_CREATED,
          data: message,
          recipients: otherMembers.map((member) => member._id.toString()),
        },
      ],
    };
  }
}
