import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Shipment } from '../entities/shipment.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { SHIPMENT_EVENTS } from '../shipment.events';

export class ShipmentCreatedAction extends Action<RequestUser | null, Shipment> {
  constructor(subject: RequestUser | null, data: Shipment) {
    super(subject, data);
  }

  build(): IAction {
    return {
      activity: this.actor?.sub
        ? {
            user: new Types.ObjectId(this.actor.sub),
            action: ActionType.CREATE,
            entity: {
              type: Shipment.name,
              _id: this.data._id,
              title: `Shipment ${this.data.proNumber}`,
            },
            message: `Shipment ${this.data.proNumber} created`,
          }
        : undefined,
      notifications: [],
      emails: [],
      socketEvents: [
        {
          event: SHIPMENT_EVENTS.SHIPMENT_CREATED,
          data: this.data,
          recipients: [],
        },
      ],
    };
  }
}
