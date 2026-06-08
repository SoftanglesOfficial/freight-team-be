import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { QUOTE_REQUEST_EVENTS } from '../quote-request.events';

export class QuoteRequestDeletedAction extends Action<RequestUser, QuoteRequest> {
  constructor(subject: RequestUser, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.DELETE,
        entity: {
          type: QuoteRequest.name,
          _id: this.data._id,
          title: `Quote for ${this.data.company_name || this.data.full_name}`,
        },
        message: `${this.actor.first_name} deleted a quote request`,
      },
      notifications: [],
      emails: [],
      socketEvents: [
        {
          event: QUOTE_REQUEST_EVENTS.QUOTE_REQUEST_DELETED,
          data: this.data,
          recipients: this.actor ? [this.actor.sub] : [],
        },
      ],
    };
  }
}
