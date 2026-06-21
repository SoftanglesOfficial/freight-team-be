import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { QUOTE_REQUEST_EVENTS } from '../quote-request.events';

export class QuoteRequestUpdatedAction extends Action<RequestUser, QuoteRequest> {
  constructor(subject: RequestUser, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.UPDATE,
        entity: {
          type: QuoteRequest.name,
          _id: this.data._id,
          title: `Quote for ${this.data.company_name || this.data.full_name}`,
        },
        message: `${this.actor.first_name} updated a quote request`,
      },
      notifications: [],
      emails: [
        {
          adminCc: false,
          to: this.data.email,
          subject:
            this.data.status === 'Quoted'
              ? `Your Quote is Ready - ${this.data.tracking_id}`
              : `Update on your Quote Request - ${this.data.tracking_id}`,
          html:
            this.data.status === 'Quoted'
              ? this.htmlBuilder
                  .hello(this.data.full_name)
                  .line(`Your quote is ready and available to review.`)
                  .divider()
                  .heading(3, 'View Your Quote')
                  .line(
                    `👉 <a href="https://freightteamlogistics.com/track-shipment?ftl-id=${this.data.tracking_id}" style="color: #FF6B35; text-decoration: none; font-weight: 500;">View & Book Your Shipment</a> - Most customers book in under 2 minutes.`,
                  )
                  .space()
                  .line(`Inside, you'll be able to:`)
                  .list(["<b>Review your Quote details and choose what's easiest</b>"])
                  .line(`<b>Option 1: Book Online</b>`)
                  .line(
                    `Click the link above to accept your quote and complete your shipment details.`,
                  )
                  .space()
                  .line(`<b>Option 2: Reply by Email</b>`)
                  .line(
                    `Prefer to keep it simple? Just reply to this email and we'll handle everything for you.`,
                  )
                  .divider()
                  .heading(3, 'A Quick Note on Pricing')
                  .line(
                    `Rates are built using real-time carrier availability and performance. If anything feels high or off, let us know — we're happy to review options and adjust where possible.`,
                  )
                  .divider()
                  .line(
                    `<i>If this shipment is time-sensitive or needs adjustments, reply here and we'll take care of it right away.</i>`,
                  )
                  .build()
              : this.data.status === 'In Progress'
              ? this.htmlBuilder
                  .hello(this.data.full_name)
                  .line(
                    `Our team is actively working on your quote for <b>${this.data.tracking_id}</b>.`,
                  )
                  .line(
                    `We are currently reviewing real-time carrier performance and negotiating rates to find the most reliable and cost-effective option for your shipment.`,
                  )
                  .divider()
                  .heading(3, 'What to Expect')
                  .list([
                    'We review multiple carriers for transit reliability.',
                    'We check for potential billing adjustments to ensure accuracy.',
                    'You will receive a final quote shortly.',
                  ])
                  .space()
                  .line(
                    `You can check the status anytime here: <a href="https://freightteamlogistics.com/track-shipment?ftl-id=${this.data.tracking_id}">Track My Quote</a>`,
                  )
                  .divider()
                  .line(
                    `<i>To add details or flag time-sensitive shipments, just reply to this email.</i>`,
                  )
                  .build()
              : this.htmlBuilder
                  .hello(this.data.full_name)
                  .line(`Your quote request status has been updated to <b>${this.data.status}</b>.`)
                  .line(`Your tracking ID is: ${this.data.tracking_id}`)
                  .line(`Thank you for your interest in our services.`)
                  .build(),
        },
      ],
      socketEvents: [
        {
          event: QUOTE_REQUEST_EVENTS.QUOTE_REQUEST_UPDATED,
          data: this.data,
          recipients: this.actor ? [this.actor.sub] : [],
        },
      ],
    };
  }
}
