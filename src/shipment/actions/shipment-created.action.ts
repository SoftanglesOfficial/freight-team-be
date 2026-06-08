import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Shipment } from '../entities/shipment.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { SHIPMENT_EVENTS } from '../shipment.events';

export class ShipmentCreatedAction extends Action<RequestUser, Shipment> {
  constructor(subject: RequestUser, data: Shipment) {
    super(subject, data);
  }

  build(): IAction {
    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.CREATE,
        entity: {
          type: Shipment.name,
          _id: this.data._id,
          title: `Shipment ${this.data.proNumber}`,
        },
        message: `${this.actor.first_name} created a new shipment ${this.data.proNumber}`,
      },
      notifications: [],
      emails: [],
      socketEvents: [
        {
          event: SHIPMENT_EVENTS.SHIPMENT_CREATED,
          data: this.data,
          recipients: this.data.customer?.email ? [this.actor.sub] : [],
        },
      ],
    };
  }
}
