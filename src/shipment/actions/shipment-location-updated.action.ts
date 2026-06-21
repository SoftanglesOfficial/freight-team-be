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

  private getCityState(address?: any): string {
    if (!address) return 'N/A';
    if (address.city && address.state) {
      return `${address.city}, ${address.state}`;
    }
    const formatted = address.formatted_address;
    if (!formatted) return 'N/A';
    const parts = formatted.split(',');
    if (parts.length >= 3) {
      const city = parts[parts.length - 3].trim();
      const stateZip = parts[parts.length - 2].trim();
      const state = stateZip.split(' ')[0];
      return `${city}, ${state}`;
    }
    return formatted;
  }

  private formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  build(): IAction {
    const customerEmail = this.data.customer?.email;
    const customerName = this.data.customer?.name || 'Customer';
    const currentLocation = this.data.current_location;
    const lastHistory = this.data.status_history?.[this.data.status_history.length - 1];
    const adminNote =
      lastHistory?.note && lastHistory.note !== 'Location updated'
        ? lastHistory.note
        : null;
    const trackingUrl = `${this.configService.get<string>('NEXT_PUBLIC_FRONTEND_URL')}/track-shipment?pro-number=${this.data.proNumber}`;

    const emailSubject = adminNote
      ? `Shipment Update – ${adminNote.slice(0, 50)}${adminNote.length > 50 ? '...' : ''} | ${this.data.proNumber}`
      : `Shipment Update – ${this.data.proNumber}`;

    const noteHtml = adminNote
      ? `<div style="background:#f0f4ff;border-left:4px solid #293674;padding:16px 20px;margin:8px 0;border-radius:0 8px 8px 0;">
         <p style="margin:0 0 6px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message from our team</p>
         <p style="margin:0;font-size:16px;color:#1a1a1a;font-weight:500;line-height:1.6;">${adminNote}</p>
       </div>`
      : `<p style="font-size:15px;color:#444;margin:0;">Your shipment is currently in transit and moving toward its destination.</p>`;

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
          newValue: currentLocation
            ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
            : 'N/A',
        },
        message: `${this.actor.first_name} updated location for shipment ${this.data.proNumber}${adminNote ? ': ' + adminNote : ''}`,
      },
      notifications: [],
      emails: customerEmail
        ? [
            {
              adminCc: false,
              priority: 'normal' as const,
              to: customerEmail,
              subject: emailSubject,
              html: this.htmlBuilder
                .hello(customerName)
                .line(`We have a new update on your shipment <b>${this.data.proNumber}</b>.`)
                .divider()
                .heading(3, 'Update')
                .line(noteHtml)
                .divider()
                .heading(3, 'Shipment Details')
                .list([
                  `<b>PRO #:</b> ${this.data.proNumber}`,
                  `<b>Carrier:</b> ${this.data.carrierName || 'N/A'}`,
                  `<b>Origin:</b> ${this.getCityState(this.data.origin_address)}`,
                  `<b>Destination:</b> ${this.getCityState(this.data.destination_address)}`,
                  `<b>ETA:</b> ${this.formatDate(this.data.estimatedDeliveryDate)}`,
                ])
                .divider()
                .line(
                  `Track your shipment anytime: <a href="${trackingUrl}" style="color:#FF6B35;font-weight:500;text-decoration:none;">Track My Shipment</a>`,
                )
                .line(`Questions? Reply to this email or call <b>(626) 765-6175</b>.`)
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
