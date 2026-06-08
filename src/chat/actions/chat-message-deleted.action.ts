import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { ChatMessage } from '../entities/chat-message.entity';
import { Types } from 'mongoose';
import { CHAT_EVENTS } from '../chat.events';
import { Action, IAction } from 'src/common/class/action.class';
import { ActionType } from 'src/common/class/action.class';
import { Chat } from '../entities/chat.entity';

export class ChatMessageDeletedAction extends Action<
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
        action: ActionType.DELETE,
        entity: {
          type: ChatMessage.name,
          _id: message._id,
          title: message.content as string,
        },
        message: `${this.actor.name} deleted a message from the chat`,
      },
      notifications: otherMembers.map((member) => ({
        message: `${this.actor.name} deleted a message from the chat`,
        user: member._id,
        action: ActionType.DELETE,
        entity: {
          type: ChatMessage.name,
          _id: message._id,
          title: message.content as string,
        },
      })),
      emails: [],
      socketEvents: [
        {
          event: CHAT_EVENTS.CHAT_MESSAGE_DELETED,
          data: message,
          recipients: otherMembers.map((member) => member._id.toString()),
        },
      ],
    };
  }
}
