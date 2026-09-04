import { QuoteRequestUpdatedAction } from './quote-request-updated.action';
import { QuoteRequestStatus } from '../entities/quote-request.entity';

describe('QuoteRequestUpdatedAction', () => {
  const baseQuote = {
    _id: '507f1f77bcf86cd799439011',
    tracking_id: 'QTR-123',
    full_name: 'Jane Customer',
    email: 'jane@example.com',
    phone: '555-0100',
    company_name: 'Acme Co',
    origin_zip_code: '90001',
    destination_zip_code: '10001',
    status: QuoteRequestStatus.QUOTED,
    quoteAmount: 1250.5,
    carrier: 'XPO Logistics',
    estimatedTransitDays: 3,
    carrierQuoteNumber: 'XPO-98765',
  } as any;

  it('includes quote details in the Quoted customer email', () => {
    const action = new QuoteRequestUpdatedAction(
      { sub: '507f1f77bcf86cd799439012', first_name: 'Admin' } as any,
      baseQuote,
      { adminIds: [] },
    );

    const emails = action.build().emails || [];
    const customerEmail = emails[0];

    expect(customerEmail.subject).toContain('Your Quote is Ready');
    expect(customerEmail.html).toContain('Quote Details');
    expect(customerEmail.html).toContain('$1,250.50');
    expect(customerEmail.html).toContain('XPO Logistics');
    expect(customerEmail.html).toContain('3 business days');
    expect(customerEmail.html).toContain('XPO-98765');
    expect(customerEmail.html).toContain('90001');
    expect(customerEmail.html).toContain('10001');
  });

  it('shows N/A for missing quote fields in the Quoted email', () => {
    const action = new QuoteRequestUpdatedAction(
      { sub: '507f1f77bcf86cd799439012', first_name: 'Admin' } as any,
      {
        ...baseQuote,
        quoteAmount: null,
        carrier: null,
        estimatedTransitDays: null,
        carrierQuoteNumber: null,
      },
      { adminIds: [] },
    );

    const html = action.build().emails?.[0]?.html || '';

    expect(html).toContain('Quote Details');
    expect(html).toContain('Quote Amount:</b> N/A');
    expect(html).toContain('Carrier:</b> N/A');
    expect(html).toContain('Estimated Transit:</b> N/A');
    expect(html).toContain('Carrier Quote #:</b> N/A');
  });

  it('does not include quote details in non-Quoted status emails', () => {
    const action = new QuoteRequestUpdatedAction(
      { sub: '507f1f77bcf86cd799439012', first_name: 'Admin' } as any,
      { ...baseQuote, status: QuoteRequestStatus.PENDING_QUOTE },
      { adminIds: [] },
    );

    const html = action.build().emails?.[0]?.html || '';

    expect(html).not.toContain('Quote Details');
    expect(html).toContain('Pending Quote');
  });
});
