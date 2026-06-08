import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Shipment } from '../entities/shipment.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { SHIPMENT_EVENTS } from '../shipment.events';
import { ConfigService } from '@nestjs/config';

export class ShipmentLocationUpdatedAction extends Action<RequestUser, Shipment> {
  private readonly configService = new ConfigService();
  constructor(subject: RequestUser, data: Shipment) {
    super(subject, data);
  }

  build(): IAction {
    const customerEmail = this.data.customer?.email;
    const customerName = this.data.customer?.name || 'Customer';
    const currentLocation = this.data.current_location;
    if (!currentLocation) {
      return {
        activity: {
          user: new Types.ObjectId(this.actor.sub),
          action: ActionType.UPDATE,
          entity: {
            type: Shipment.name,
            _id: this.data._id,
            title: `Shipment ${this.data.proNumber}`,
          },
          message: `${this.actor.first_name} updated shipment ${this.data.proNumber} location`,
        },
        notifications: [],
        emails: [],
        socketEvents: [],
      };
    }

    // Format location for display
    const locationText = `Latitude: ${currentLocation.latitude.toFixed(6)}, Longitude: ${currentLocation.longitude.toFixed(6)}`;
    const trackingUrl = `${this.configService.get<string>('NEXT_PUBLIC_FRONTEND_URL')}/track-shipment?pro-number=${this.data.proNumber}`;

    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.UPDATE,
        entity: {
          type: Shipment.name,
          _id: this.data._id,
          title: `Shipment ${this.data.proNumber}`,
        },
        change: {
          field: 'current_location',
          newValue: locationText,
        },
        message: `${this.actor.first_name} updated shipment ${this.data.proNumber} current location`,
      },
      notifications: [],
      emails: customerEmail
        ? [
            {
              adminCc: false,
              priority: 'normal',
              to: customerEmail,
              subject: `Shipment Location Updated - ${this.data.proNumber}`,
              html: this.htmlBuilder
                .hello(customerName)
                .heading(2, 'Shipment Location Update')
                .line(`Your shipment location has been updated.`)
                .space()
                .line('Shipment Details:', { strong: true })
                .line(`Pro Number: ${this.data.proNumber}`)
                .space()
                .button('Track Shipment', trackingUrl, 'primary')
                .space()
                .link(trackingUrl, trackingUrl)
                .space()
                .build(),
            },
          ]
        : [],
      socketEvents: [
        {
          event: SHIPMENT_EVENTS.SHIPMENT_LOCATION_UPDATED,
          data: this.data,
          recipients: customerEmail ? [this.actor.sub] : [],
        },
      ],
    };
  }
}
