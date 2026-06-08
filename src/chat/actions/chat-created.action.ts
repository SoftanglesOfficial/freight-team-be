import { Chat } from '../entities/chat.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { CHAT_EVENTS } from 'src/chat/chat.events';
import { Action, ActionType, IAction } from 'src/common/class/action.class';

export class ChatCreatedAction extends Action<RequestUser, Chat> {
  constructor(subject: RequestUser, data: Chat) {
    super(subject, data);
  }

  build(): IAction {
    const otherMembers = this.data.members.filter(
      (member) => member._id.toString() !== this.actor.sub,
    );

    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.CREATE,
        entity: {
          type: Chat.name,
          _id: this.data._id,
          title: this.data.name,
        },
        message: `${this.actor.name} created a new chat`,
      },
      notifications: otherMembers.map((member) => ({
        message: `${this.actor.name} created a new chat`,
        user: member._id,
        action: ActionType.CREATE,
        entity: {
          type: Chat.name,
          _id: this.data._id,
          title: this.data.name,
        },
      })),
      emails: [],
      socketEvents: [
        {
          event: CHAT_EVENTS.CHAT_CREATED,
          data: this.data,
          recipients: otherMembers.map((member) => member._id.toString()),
        },
      ],
    };
  }
}
