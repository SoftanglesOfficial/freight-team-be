import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Shipment } from '../entities/shipment.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { SHIPMENT_EVENTS } from '../shipment.events';

export class ShipmentCreatedAction extends Action<RequestUser | null, Shipment> {
  constructor(subject: RequestUser | null, data: Shipment, changes?: Record<string, any>) {
    super(subject, data, changes);
  }

  build(): IAction {
    const adminIds: string[] = this.changes?.adminIds || [];

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
      notifications: adminIds.map((adminId) => ({
        user: new Types.ObjectId(adminId),
        action: ActionType.CREATE,
        entity: {
          type: Shipment.name,
          _id: this.data._id,
          title: `Shipment ${this.data.proNumber}`,
        },
        message: `Shipment ${this.data.proNumber} created`,
        url: `/admin/shipments/${this.data._id}`,
        seen: false,
      })),
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
