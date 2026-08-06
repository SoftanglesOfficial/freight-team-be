import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';

export class QuoteAcceptedAction extends Action<RequestUser | null, QuoteRequest> {
  constructor(
    subject: RequestUser | null,
    data: QuoteRequest,
    changes?: Record<string, any>,
  ) {
    super(subject, data, changes);
  }

  build(): IAction {
    const adminIds: string[] = this.changes?.adminIds || [];
    const customerUserId: string | undefined = this.changes?.customerUserId;
    const entity = {
      type: QuoteRequest.name,
      _id: this.data._id,
      title: `Quote ${this.data.tracking_id}`,
    };
    const message = `Quote ${this.data.tracking_id} accepted`;

    const notifications = adminIds.map((adminId) => ({
      user: new Types.ObjectId(adminId),
      action: ActionType.CREATE,
      entity,
      message,
      url: '/admin/quotes',
      seen: false,
    }));

    if (customerUserId) {
      notifications.push({
        user: new Types.ObjectId(customerUserId),
        action: ActionType.CREATE,
        entity,
        message,
        url: '/customer/quotes',
        seen: false,
      });
    }

    return {
      activity: this.actor?.sub
        ? {
            user: new Types.ObjectId(this.actor.sub),
            action: ActionType.CREATE,
            entity,
            message,
          }
        : undefined,
      notifications,
      emails: [
        {
          adminCc: true,
          to: this.data.email,
          subject: `Shipment Confirmation - Booking for ${this.data.tracking_id} is in Progress`,
          html: this.htmlBuilder
            .hello(this.data.full_name)
            .line(
              `Thank you for choosing Freight Team Logistics! We have received your final booking details for quote <b>${this.data.tracking_id}</b>.`,
            )
            .divider()
            .heading(3, 'Next Steps')
            .list([
              '<b>Review</b>: Our team is reviewing the pickup and delivery addresses you provided.',
              '<b>Carrier Booking</b>: We are finalizing the dispatch with the carrier.',
              '<b>BOL Delivery</b>: You will receive your Bill of Lading (BOL) via email shortly. Please ensure this is used at pickup.',
              '<b>Tracking</b>: You can continue to track your shipment using the same tracking ID.',
            ])
            .space()
            .line(
              `If you need to make any immediate changes, please reply to this email or call us at (626) 765-6175.`,
            )
            .divider()
            .line(`Kind Regards,`)
            .line(`<b>FTL Warehouse, Inc.</b>`)
            .line(`Freight Team Logistics`)
            .build(),
        },
        {
          adminCc: false,
          to: 'sales@ftlwarehouse.com',
          subject: `Quote Converted to Shipment – ${this.data.full_name} | ${this.data.tracking_id}`,
          html: this.htmlBuilder
            .hello('Team')
            .line(
              `A customer has accepted quote <b>${this.data.tracking_id}</b> and it has been converted to a shipment.`,
            )
            .divider()
            .heading(3, 'Customer Information')
            .list([
              `<b>Name:</b> ${this.data.full_name}`,
              `<b>Company:</b> ${this.data.company_name || 'N/A'}`,
              `<b>Email:</b> ${this.data.email}`,
              `<b>Phone:</b> ${this.data.phone || 'N/A'}`,
            ])
            .divider()
            .heading(3, 'Quote Details')
            .list([
              `<b>Tracking ID:</b> ${this.data.tracking_id}`,
              `<b>Carrier:</b> ${this.data.carrier || 'TBD'}`,
              `<b>Quote Amount:</b> ${this.data.quoteAmount != null ? `$${this.data.quoteAmount}` : 'N/A'}`,
              `<b>Origin Zip:</b> ${this.data.origin_zip_code}`,
              `<b>Destination Zip:</b> ${this.data.destination_zip_code}`,
            ])
            .divider()
            .line(
              `👉 <a href="https://freightteamlogistics.com/admin/shipments" style="color:#FF6B35;font-weight:500;text-decoration:none;">View Shipments in Admin Panel</a>`,
            )
            .build(),
        },
      ],
    };
  }
}
