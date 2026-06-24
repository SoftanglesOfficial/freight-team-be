import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { QuoteRequest } from '../entities/quote-request.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { QUOTE_REQUEST_EVENTS } from '../quote-request.events';

export class QuoteRequestCreatedAction extends Action<{}, QuoteRequest> {
  constructor(subject: {}, data: QuoteRequest) {
    super(subject, data);
  }

  build(): IAction {
    const freightSummary = `${this.data.pallets.length} Pallet(s), ${this.data.pallets.reduce((acc, p) => acc + p.weight, 0)} lbs total`;
    const dimensions = this.data.pallets.map((p) => `${p.length}x${p.width}x${p.height}`).join(', ');

    return {
      notifications: [],
      emails: [
        {
          adminCc: true,
          to: this.data.email,
          subject: `Quote Request Received - ${this.data.tracking_id}`,
          html: this.htmlBuilder
            .hello(this.data.full_name)
            .line(`Thank you for your quote request — we've received your shipment details!`)
            .line(
              `<b>To add details or flag time-sensitive shipments, reply to this email with the necessary updates and our team will adjust your quote.</b>`,
            )
            .divider()
            .heading(3, 'Shipment Details Submitted')
            .list([
              `<b>Pickup:</b> ${this.data.company_name ? this.data.company_name + ', ' : ''}${this.data.origin_zip_code}`,
              `<b>Delivery:</b> ${this.data.destination_zip_code}`,
              `<b>Freight:</b> ${freightSummary} (${dimensions})`,
              `<b>Commodity:</b> ${this.data.special_instructions || 'General Freight'}`,
              `<b>Special Requirements:</b> ${[
                this.data.is_time_sensitive ? 'Time Sensitive' : '',
                this.data.is_residential ? 'Residential' : '',
              ]
                .filter(Boolean)
                .join(', ') || 'None'}`,
            ])
            .divider()
            .heading(3, 'Your Tracking ID')
            .heading(2, this.data.tracking_id)
            .line(`You can track the status of your quote anytime here:`)
            .line(
              `👉 <a href="https://freightteamlogistics.com/track-shipment?ftl-id=${this.data.tracking_id}" style="color:#FF6B35;font-weight:500;text-decoration:none;">Track Your Quote</a>`,
            )
            .space()
            .line(`Status updates will show:`)
            .list([
              'Received',
              'In Progress',
              'Complete (with full quote details and booking option)',
            ])
            .divider()
            .heading(3, 'What Happens Next')
            .line(
              `Our team is actively building your quote using real-time carrier performance and current market conditions.`,
            )
            .line(
              `We don't auto-generate rates — we review each shipment to ensure accuracy, reliability, and the best overall option.`,
            )
            .line(`You'll receive your quote shortly.`)
            .divider()
            .heading(3, 'When You Receive Your Quote')
            .line(`You'll be able to:`)
            .list([
              'Review full details online',
              'Accept and book instantly',
              'Provide feedback if the quote isn’t a fit',
            ])
            .line(
              `If pricing is higher or lower than expected, we genuinely want to know. Your feedback helps us refine carrier selection and pricing for future shipments.`,
            )
            .divider()
            .line(
              `If you need to add details or have time-sensitive requirements, just reply to this email — we’re already on it.`,
            )
            .space()
            .line(`Kind Regards,`)
            .line(`<b>FTL Warehouse, Inc.</b>`)
            .line(`Freight Team Logistics`)
            .space()
            .line(`📧 Sales@FTLwarehouse.com`)
            .line(`📞 Office: (626) 765-6175`)
            .space()
            .line(`<b>Text Message</b>`)
            .line(`Al: (818) 325-7615`)
            .line(`Mandy: (818) 414-2585`)
            .space()
            .line(
              `<i>Please email when possible — our team collaborates internally to respond quickly and accurately.</i>`,
            )
            .divider()
            .heading(4, 'Carrier Billing Advisory')
            .line(
              `<small>Carriers such as XPO, Old Dominion, Estes, Saia, and Custom Co may issue reweigh, dimensional, or classification adjustments after delivery. These changes are determined by the carrier and will be passed through once received.</small>`,
            )
            .line(
              `<small>Transit times are estimates only and are not guaranteed unless explicitly stated.</small>`,
            )
            .line(
              `<small>All shipments must move on an FTL Warehouse-approved Bill of Lading (BOL). Failure to do so may result in additional charges.</small>`,
            )
            .line(
              `<small>To file a claim, a signed Proof of Delivery noting damage or shortage at time of delivery is required.</small>`,
            )
            .line(
              `<small>Declared value must be provided prior to pickup to ensure proper coverage.</small>`,
            )
            .build(),
        },
        {
          adminCc: false,
          to: 'sales@ftlwarehouse.com',
          subject: `New Quote Request – ${this.data.full_name} | ${this.data.tracking_id}`,
          html: this.htmlBuilder
            .hello('Team')
            .line(
              `A new quote request has been submitted. Here are the customer details:`,
            )
            .divider()
            .heading(3, 'Customer Information')
            .list([
              `<b>Name:</b> ${this.data.full_name}`,
              `<b>Company:</b> ${this.data.company_name || 'N/A'}`,
              `<b>Email:</b> ${this.data.email}`,
              `<b>Phone:</b> ${this.data.phone}`,
            ])
            .divider()
            .heading(3, 'Shipment Details')
            .list([
              `<b>Tracking ID:</b> ${this.data.tracking_id}`,
              `<b>Origin Zip:</b> ${this.data.origin_zip_code}`,
              `<b>Destination Zip:</b> ${this.data.destination_zip_code}`,
              `<b>Pallets:</b> ${this.data.pallets.length} pallet(s), ${this.data.pallets.reduce((acc, p) => acc + p.weight, 0)} lbs total`,
              `<b>Dimensions:</b> ${this.data.pallets.map((p) => `${p.length}x${p.width}x${p.height}`).join(', ')}`,
              `<b>Residential:</b> ${this.data.is_residential ? 'Yes' : 'No'}`,
              `<b>Time Sensitive:</b> ${this.data.is_time_sensitive ? 'Yes' : 'No'}`,
              `<b>Special Instructions:</b> ${this.data.special_instructions || 'None'}`,
            ])
            .divider()
            .line(
              `👉 <a href="https://freightteamlogistics.com/admin/quotes" style="color: #FF6B35; text-decoration: none; font-weight: 500;">View in Admin Panel</a>`,
            )
            .build(),
        },
      ],
    };
  }
}
