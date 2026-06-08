import { Action, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';

export class QuoteFollowUpAction extends Action<RequestUser, QuoteRequest> {
  constructor(subject: RequestUser, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    return {
      notifications: [],
      emails: [
        {
          adminCc: true,
          to: this.data.email,
          subject: `Following up on your shipment: ${this.data.origin_zip_code} to ${this.data.destination_zip_code}`,
          delay: 5 * 24 * 60 * 60 * 1000, // 5 days in milliseconds
          html: this.htmlBuilder
            .hello(this.data.full_name)
            .line(`I’m checking in on the shipment you recently quoted with us.`)
            .line(
              `I know we didn’t move forward on this one, but I wanted to see—<b>how did the competitor’s quote work out for you?</b>`,
            )
            .space()
            .line(
              `We genuinely value your feedback. Whether it was the price, transit time, or something else, knowing how we compared helps us refine our carrier selection and pricing for your future shipments.`,
            )
            .divider()
            .line(
              `If you have a moment to share your experience or if there's a target price we should keep in mind for next time, just reply to this email.`,
            )
            .space()
            .line(`We’re here when you need us for the next one!`)
            .space()
            .line(`Kind Regards,`)
            .line(`<b>FTL Warehouse, Inc.</b>`)
            .line(`Freight Team Logistics`)
            .space()
            .line(`📧 Sales@FTLwarehouse.com`)
            .line(`📞 Office: (626) 765-6175`)
            .build(),
        },
      ],
    };
  }
}
