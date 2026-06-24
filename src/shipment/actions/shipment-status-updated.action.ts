import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Shipment } from '../entities/shipment.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { SHIPMENT_EVENTS } from '../shipment.events';
import { ConfigService } from '@nestjs/config';

export class ShipmentStatusUpdatedAction extends Action<RequestUser, Shipment> {
  private readonly configService = new ConfigService();
  constructor(subject: RequestUser, data: Shipment, changes?: Record<string, any>) {
    super(subject, data, changes);
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

  private formatDateTime(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  build(): IAction {
    const customerEmail = this.data.customer?.email;
    const customerName = this.data.customer?.name || 'Customer';
    const oldStatus = this.changes?.oldStatus || 'Unknown';
    const newStatus = this.data.status || 'Unknown';
    const oldStatusNorm = String(oldStatus).toLowerCase();
    const newStatusNorm = String(newStatus).toLowerCase();

    // Only send email if status actually changed
    if (oldStatusNorm === newStatusNorm) {
      return {
        activity: {
          user: new Types.ObjectId(this.actor.sub),
          action: ActionType.UPDATE,
          entity: {
            type: Shipment.name,
            _id: this.data._id,
            title: `Shipment ${this.data.proNumber}`,
          },
          message: `${this.actor.first_name} updated shipment ${this.data.proNumber}`,
        },
        notifications: [],
        emails: [],
        socketEvents: [],
      };
    }

    const lastHistory = this.data.status_history?.[this.data.status_history.length - 1];
    const trackingUrl = `${this.configService.get<string>('NEXT_PUBLIC_FRONTEND_URL')}/track-shipment?ftl-id=${this.data.proNumber}`;

    let emailSubject = `Shipment Status Updated - ${this.data.proNumber}`;
    let emailHtml = '';

    if (newStatusNorm === 'in-transit') {
      emailSubject = `Shipment In Transit – ${this.data.proNumber}`;
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .line(`Your shipment is currently <b>in transit</b>.`)
        .divider()
        .heading(3, 'Shipment Details')
        .list([
          `<b>Pickup:</b> ${this.getCityState(this.data.origin_address)}`,
          `<b>Delivery:</b> ${this.getCityState(this.data.destination_address)}`,
          `<b>Carrier:</b> ${this.data.carrierName || 'N/A'}`,
          `<b>PRO #:</b> ${this.data.proNumber}`,
          `<b>ETA:</b> ${this.formatDate(this.data.estimatedDeliveryDate)}`,
          `<b>Last Update:</b> ${this.formatDateTime(lastHistory?.timestamp)} – ${lastHistory?.note || 'In transit'}`,
        ])
        .divider()
        .heading(3, 'Current Status')
        .line(`Your freight is moving through the carrier's network toward final delivery.`)
        .line(
          `You can track your shipment anytime on the carrier direct website, via email request any time, or via your online portal.`,
        )
        .divider()
        .heading(3, 'What to Expect')
        .line(
          `Transit times are estimates based on carrier routing and do not include weekends or holidays unless otherwise specified.`,
        )
        .line(
          `If an appointment is required for delivery, it will be scheduled directly with the receiving location and generally causes a minimum one business day delay as freight must arrive at the destination terminal prior to appointment-setting.`,
        )
        .divider()
        .heading(3, 'We’re Monitoring It')
        .line(
          `Our team is actively monitoring your shipment. If anything changes, we will update you right away.`,
        )
        .line(
          `If you need a status check, updated ETA, or assistance, just reply to this email or log into your online account.`,
        )
        .build();
    } else if (newStatusNorm === 'delivered') {
      emailSubject = `Delivered – ${this.data.proNumber}`;
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .line(`Your shipment has been <b>successfully delivered</b>.`)
        .divider()
        .heading(3, 'Delivery Details')
        .list([
          `<b>Delivery Location:</b> ${this.getCityState(this.data.destination_address)}`,
          `<b>Date Delivered:</b> ${this.formatDate(this.data.deliveryDate || lastHistory?.timestamp)}`,
          `If you have any questions or require a POD, please let us know and we will be happy to assist you.`,
        ])
        .divider()
        .heading(3, 'Anything We Should Know?')
        .line(
          `If there were any issues at delivery, such as damage or shortage, please reply to this email as soon as possible so we can assist with next steps.`,
        )
        .divider()
        .heading(3, 'Need Another Quote?')
        .line(
          `Just reply here with the details! Or visit us online <a href="https://freightteamlogistics.com/request-quote" style="color: #FF6B35; text-decoration: none; font-weight: 500;">https://freightteamlogistics.com/request-quote</a>`,
        )
        .divider()
        .line(
          `Thank you for trusting us with your shipment. If you have another load coming up, we're ready when you are.`,
        )
        .build();
    } else if (newStatusNorm === 'invoice-ready') {
      emailSubject = `Invoice Ready – ${this.data.proNumber} | Payment Options`;
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .line(`Your invoice for shipment <b>${this.data.proNumber}</b> is now ready.`)
        .divider()
        .heading(3, 'Invoice Details')
        .list([
          `<b>Shipment Reference:</b> ${this.data.proNumber}`,
          `<b>Carrier:</b> ${this.data.carrierName || 'N/A'}`,
        ])
        .divider()
        .heading(3, 'View & Download Invoice')
        .line(
          `👉 <a href="https://freightteamlogistics.com/auth/login" style="color:#FF6B35;font-weight:500;text-decoration:none;">View Invoice in Your Account</a>`,
        )
        .divider()
        .heading(3, 'Payment Options')
        .line('We accept the following:')
        .list([
          'ACH / Bank Transfer',
          'Zelle',
          'Wire Transfer',
          'Check (mailed to address on invoice)',
          'Credit Card (by phone)',
        ])
        .line(
          `For payment instructions or to pay by phone, reply to this email. For fastest processing, ACH or Zelle is preferred.`,
        )
        .divider()
        .heading(3, 'Questions or Disputes')
        .line(
          `If you have any questions regarding your invoice, reply to this email or contact us at <a href="mailto:sales@ftlwarehouse.com" style="color:#FF6B35;">sales@ftlwarehouse.com</a>.`,
        )
        .build();
    } else {
      // Default template for other statuses
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .heading(2, 'Shipment Status Update')
        .line(`Your shipment status has been updated.`)
        .space()
        .line(`<strong>Shipment Details:</strong>`)
        .line(`Pro Number: ${this.data.proNumber}`)
        .line(`Previous Status: ${oldStatus}`)
        .line(`Current Status: ${newStatus}`, { strong: true })
        .space()
        .button('Track Shipment', trackingUrl, 'primary')
        .space()
        .link(trackingUrl, trackingUrl)
        .space()
        .build();
    }

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
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
        },
        message: `${this.actor.first_name} updated shipment ${this.data.proNumber} status from ${oldStatus} to ${newStatus}`,
      },
      notifications: [],
      emails: customerEmail && emailHtml
        ? [
            {
              adminCc: true,
              priority: 'high',
              to: customerEmail,
              subject: emailSubject,
              html: emailHtml,
            },
          ]
        : [],
      socketEvents: [
        {
          event: SHIPMENT_EVENTS.SHIPMENT_STATUS_UPDATED,
          data: this.data,
          recipients: customerEmail ? [this.actor.sub] : [],
        },
      ],
    };
  }
}
