import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { Document, DocumentCategory } from '../entities/document.entity';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

export class DocumentUploadedAction extends Action<RequestUser, Document> {
  private readonly configService = new ConfigService();

  constructor(subject: RequestUser, data: Document) {
    super(subject, data);
  }

  private async getFileBuffer(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch document: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`Error fetching document for attachment: ${error.message}`);
      throw error;
    }
  }

  private formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async build(): Promise<IAction> {
    const customer = this.data.customer as any;
    const shipment = this.data.shipment_id as any;
    const customerEmail =
      customer?.email ||
      shipment?.customer?.email ||
      shipment?.customer_email ||
      shipment?.email ||
      this.data.fallback_email ||
      null;

    const customerName = customer?.first_name
      ? `${customer.first_name} ${customer.last_name || ''}`.trim()
      : shipment?.customer?.name ||
        shipment?.full_name ||
        shipment?.customer_name ||
        this.data.fallback_name ||
        'Customer';
    const proNumber = shipment?.proNumber || 'N/A';

    // Only send email for BOL and Invoice categories
    if (this.data.category !== DocumentCategory.BOL && this.data.category !== DocumentCategory.INVOICE) {
      return {
        activity: {
          user: new Types.ObjectId(this.actor.sub),
          action: ActionType.UPLOAD,
          entity: {
            type: Document.name,
            _id: this.data._id,
            title: this.data.name,
          },
          message: `${this.actor.first_name} uploaded a document: ${this.data.name}`,
        },
      };
    }

    let emailSubject = '';
    let emailHtml = '';
    let attachments: any[] = [];

    try {
      const buffer = await this.getFileBuffer(this.data.url);
      attachments.push({
        filename: this.data.name,
        content: buffer,
        contentType: this.data.type,
      });
    } catch (error) {
      // If attachment fails, we'll still send the email but without the file
      console.error('Proceeding without attachment due to error');
    }

    if (this.data.category === DocumentCategory.INVOICE) {
      emailSubject = `Invoice Ready – ${this.data.internal_id} | Payment Options`;
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .line(`Your invoice is now ready.`)
        .divider()
        .heading(3, 'Invoice Details')
        .list([
          `<b>Invoice #:</b> ${this.data.internal_id}`,
          `<b>Shipment Reference:</b> ${proNumber}`,
        ])
        .divider()
        .heading(3, 'View & Download Invoice')
        .line(`👉 View Invoice on your online account here`)
        .link(
          'https://freightteamlogistics.com/auth/login',
          'https://freightteamlogistics.com/auth/login',
        )
        .divider()
        .heading(3, 'Payment Options')
        .line(`We accept the following:`)
        .list([
          'ACH / Bank Transfer',
          'Zelle',
          'Wire Transfer',
          'Check (mailed to address on invoice)',
          'Credit Card (by phone)',
        ])
        .line(
          `If you need payment instructions or prefer to pay by phone, just reply to this email. For fastest processing, ACH or Zelle is preferred.`,
        )
        .divider()
        .heading(3, 'Questions or Disputes')
        .line(`If anything looks off, please let us know. We're happy to review and resolve quickly.`)
        .divider()
        .line(`Thank you as always — we appreciate your business.`)
        .build();
    } else if (this.data.category === DocumentCategory.BOL) {
      const pickupDate = shipment?.pickupDate ? this.formatDate(shipment.pickupDate) : '[Date]';
      emailSubject = `BOL Attached – Pickup Scheduled ${pickupDate}`;
      emailHtml = this.htmlBuilder
        .hello(customerName)
        .line(`Thank you for your order.`)
        .line(
          `Your <b>Bill of Lading (BOL)</b> is attached, and your shipment is scheduled for pickup. Please confirm all pickup details are accurate prior to scheduled dispatch.`,
        )
        .divider()
        .heading(3, 'Important – Please Read')
        .list([
          'Please <b>print and attach a copy of this BOL to each pallet</b> to ensure a smooth pickup',
          'Use <b>only the BOL provided by FTL Warehouse</b> to avoid billing discrepancies or additional charges',
        ])
        .divider()
        .heading(3, 'Pickup Requirements')
        .line(`If the pickup or receiving location requires any of the following, please provide them in advance:`)
        .list(['Pickup number', 'PO number', 'Reference numbers'])
        .line(
          `Missing required information may result in a refused pickup and additional charges such as <b>Dry Run, TONU, or Re-Delivery fees</b>.`,
        )
        .divider()
        .heading(3, 'Delivery & Claims')
        .line(
          `At the time of delivery, any <b>damage or shortage</b> must be clearly noted on the <b>Proof of Delivery (POD)</b> and signed by both the driver and receiver.`,
        )
        .line(`Without proper notation, we may be unable to file a claim.`)
        .divider()
        .line(
          `If anything needs to be updated prior to pickup, please reply to this email as soon as possible so we can revise your BOL.`,
        )
        .line(`We're here if you need anything.`)
        .build();
    }

    return {
      activity: {
        user: new Types.ObjectId(this.actor.sub),
        action: ActionType.UPLOAD,
        entity: {
          type: Document.name,
          _id: this.data._id,
          title: this.data.name,
        },
        message: `${this.actor.first_name} uploaded ${this.data.category}: ${this.data.name}`,
      },
      emails: customerEmail
        ? [
            {
              adminCc: true,
              priority: 'high',
              to: customerEmail,
              subject: emailSubject,
              html: emailHtml,
              attachments: attachments.length > 0 ? attachments : undefined,
              idempotencyKey: `doc-upload-${this.data._id.toString()}`,
            },
          ]
        : [],
    };
  }
}
