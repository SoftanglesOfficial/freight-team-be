import { Action, IAction } from 'src/common/class/action.class';
import { HtmlBuilder } from 'src/common/class/html-builder.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';

export class QuoteFollowUpAction extends Action<RequestUser, QuoteRequest> {
  constructor(subject: RequestUser, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    const feedback = this.data.feedback || {};

    const customerEmailHtml = new HtmlBuilder()
      .hello(this.data.full_name)
      .line(`I'm checking in on the shipment you recently quoted with us.`)
      .line(
        `I know we didn't move forward on this one, but I wanted to see—<b>how did the competitor's quote work out for you?</b>`,
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
      .line(`We're here when you need us for the next one!`)
      .space()
      .line(`Kind Regards,`)
      .line(`<b>FTL Warehouse, Inc.</b>`)
      .line(`Freight Team Logistics`)
      .space()
      .line(`📧 Sales@FTLwarehouse.com`)
      .line(`📞 Office: (626) 765-6175`)
      .build();

    const adminEmailHtml = new HtmlBuilder()
      .hello('Team')
      .line(
        `<b>${this.data.full_name}</b> has declined quote <b>${this.data.tracking_id}</b>.`,
      )
      .divider()
      .heading(3, 'Customer Details')
      .list([
        `<b>Name:</b> ${this.data.full_name}`,
        `<b>Email:</b> ${this.data.email}`,
        `<b>Phone:</b> ${this.data.phone}`,
        `<b>Company:</b> ${this.data.company_name || 'N/A'}`,
      ])
      .divider()
      .heading(3, 'Shipment')
      .list([
        `<b>Route:</b> ${this.data.origin_zip_code} → ${this.data.destination_zip_code}`,
        `<b>Tracking ID:</b> ${this.data.tracking_id}`,
        `<b>Quote Amount:</b> ${this.data.quoteAmount != null ? `$${this.data.quoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'}`,
      ])
      .divider()
      .heading(3, 'Decline Reason')
      .list(
        [
          feedback.reason ? `<b>Reason:</b> ${feedback.reason}` : null,
          feedback.paidPrice ? `<b>Price They Paid:</b> $${feedback.paidPrice}` : null,
          feedback.chosenCarrier ? `<b>Carrier They Chose:</b> ${feedback.chosenCarrier}` : null,
          feedback.targetPrice ? `<b>Target Price:</b> $${feedback.targetPrice}` : null,
          feedback.otherReason ? `<b>Notes:</b> ${feedback.otherReason}` : null,
        ].filter((item): item is string => item !== null),
      )
      .divider()
      .line(
        `👉 <a href="https://freightteamlogistics.com/admin/quotes" style="color:#FF6B35;font-weight:500;text-decoration:none;">View in Admin Panel</a>`,
      )
      .build();

    return {
      notifications: [],
      emails: [
        {
          adminCc: true,
          to: this.data.email,
          subject: `Following up on your shipment: ${this.data.origin_zip_code} to ${this.data.destination_zip_code}`,
          delay: 5 * 24 * 60 * 60 * 1000, // 5 days in milliseconds
          html: customerEmailHtml,
        },
        {
          adminCc: false,
          to: 'sales@ftlwarehouse.com',
          subject: `Quote Declined – ${this.data.tracking_id} | ${this.data.full_name}`,
          html: adminEmailHtml,
        },
      ],
    };
  }
}
