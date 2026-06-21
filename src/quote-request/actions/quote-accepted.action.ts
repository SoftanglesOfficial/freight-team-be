import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';

export class QuoteAcceptedAction extends Action<RequestUser | null, QuoteRequest> {
  constructor(subject: RequestUser | null, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    return {
      activity: this.actor?.sub
        ? {
            user: new Types.ObjectId(this.actor.sub),
            action: ActionType.CREATE,
            entity: {
              type: QuoteRequest.name,
              _id: this.data._id,
              title: `Quote ${this.data.tracking_id}`,
            },
            message: `Quote ${this.data.tracking_id} accepted`,
          }
        : undefined,
      notifications: [],
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
      ],
    };
  }
}
