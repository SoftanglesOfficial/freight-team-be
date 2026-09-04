import { EmailBlock } from './email-blocks.util';

export interface DefaultEmailTemplate {
  name: string;
  description: string;
  variables: string[];
  defaultSubject: string;
  defaultBlocks: EmailBlock[];
}

export const DEFAULT_TEMPLATES: Record<string, DefaultEmailTemplate> = {
  'quote-ready': {
    name: 'Quote Ready',
    description: 'Sent to the customer when their quote request status changes to "Quoted".',
    variables: [
      'customerName',
      'quoteAmount',
      'carrier',
      'estimatedTransitDays',
      'carrierQuoteNumber',
      'originZip',
      'destinationZip',
      'trackingId',
    ],
    defaultSubject: 'Your Quote is Ready - {{trackingId}}',
    defaultBlocks: [
      { type: 'paragraph', text: 'Hi {{customerName}}, your quote is ready and available to review.' },
      { type: 'heading', text: 'Quote Details' },
      {
        type: 'list',
        items: [
          '**Quote Amount:** {{quoteAmount}}',
          '**Carrier:** {{carrier}}',
          '**Estimated Transit:** {{estimatedTransitDays}}',
          '**Carrier Quote #:** {{carrierQuoteNumber}}',
          '**Route:** {{originZip}} to {{destinationZip}}',
        ],
      },
      { type: 'heading', text: 'View Your Quote' },
      {
        type: 'paragraph',
        text: 'View & book your shipment (most customers book in under 2 minutes): https://freightteamlogistics.com/track-shipment?ftl-id={{trackingId}}',
      },
      {
        type: 'paragraph',
        text: '**Option 1: Book Online** — Click the link above to accept your quote and complete your shipment details.',
      },
      {
        type: 'paragraph',
        text: "**Option 2: Reply by Email** — Prefer to keep it simple? Just reply to this email and we'll handle everything for you.",
      },
      { type: 'heading', text: 'A Quick Note on Pricing' },
      {
        type: 'paragraph',
        text: "Rates are built using real-time carrier availability and performance. If anything feels high or off, let us know — we're happy to review options and adjust where possible.",
      },
      {
        type: 'paragraph',
        text: "If this shipment is time-sensitive or needs adjustments, reply here and we'll take care of it right away.",
      },
    ],
  },

  'quote-in-progress': {
    name: 'Quote In Progress',
    description: 'Sent to the customer when their quote request status changes to "In Progress".',
    variables: ['customerName', 'trackingId'],
    defaultSubject: 'Update on your Quote Request - {{trackingId}}',
    defaultBlocks: [
      {
        type: 'paragraph',
        text: 'Hi {{customerName}}, our team is actively working on your quote for {{trackingId}}.',
      },
      {
        type: 'paragraph',
        text: 'We are currently reviewing real-time carrier performance and negotiating rates to find the most reliable and cost-effective option for your shipment.',
      },
      { type: 'heading', text: 'What to Expect' },
      {
        type: 'list',
        items: [
          'We review multiple carriers for transit reliability.',
          'We check for potential billing adjustments to ensure accuracy.',
          'You will receive a final quote shortly.',
        ],
      },
      {
        type: 'paragraph',
        text: 'You can check the status anytime here: https://freightteamlogistics.com/track-shipment?ftl-id={{trackingId}}',
      },
      {
        type: 'paragraph',
        text: 'To add details or flag time-sensitive shipments, just reply to this email.',
      },
    ],
  },

  'bol-send': {
    name: 'BOL Sent to Customer',
    description: 'Sent to the customer when staff explicitly press "Send BOL to Customer".',
    variables: ['customerName', 'pickupDate'],
    defaultSubject: 'BOL Attached – Pickup Scheduled {{pickupDate}}',
    defaultBlocks: [
      { type: 'paragraph', text: 'Hi {{customerName}}, thank you for your order.' },
      {
        type: 'paragraph',
        text: 'Your Bill of Lading (BOL) is attached, and your shipment is scheduled for pickup. Please confirm all pickup details are accurate prior to scheduled dispatch.',
      },
      { type: 'heading', text: 'Important – Please Read' },
      {
        type: 'list',
        items: [
          'Please **print and attach a copy of this BOL to each pallet** to ensure a smooth pickup',
          'Use **only the BOL provided by FTL Warehouse** to avoid billing discrepancies or additional charges',
        ],
      },
      { type: 'heading', text: 'Pickup Requirements' },
      {
        type: 'paragraph',
        text: 'If the pickup or receiving location requires any of the following, please provide them in advance:',
      },
      { type: 'list', items: ['Pickup number', 'PO number', 'Reference numbers'] },
      {
        type: 'paragraph',
        text: 'Missing required information may result in a refused pickup and additional charges such as **Dry Run, TONU, or Re-Delivery fees**.',
      },
      { type: 'heading', text: 'Delivery & Claims' },
      {
        type: 'paragraph',
        text: 'At the time of delivery, any **damage or shortage** must be clearly noted on the **Proof of Delivery (POD)** and signed by both the driver and receiver.',
      },
      { type: 'paragraph', text: 'Without proper notation, we may be unable to file a claim.' },
      {
        type: 'paragraph',
        text: 'If anything needs to be updated prior to pickup, please reply to this email as soon as possible so we can revise your BOL.',
      },
      { type: 'paragraph', text: "We're here if you need anything." },
    ],
  },
};
