import { QuoteRequestCreatedAction } from './quote-request-created.action';

describe('QuoteRequestCreatedAction', () => {
  it('labels the technical tracking ID as Quote Reference', () => {
    const action = new QuoteRequestCreatedAction(
      {},
      {
        _id: '507f1f77bcf86cd799439011',
        tracking_id: 'QTR-123',
        full_name: 'Customer',
        email: 'customer@example.com',
        phone: '555-0100',
        company_name: 'Company',
        origin_zip_code: '90001',
        destination_zip_code: '10001',
        pallets: [{ weight: 100, length: 48, width: 40, height: 48 }],
        is_time_sensitive: false,
        is_residential: false,
      } as any,
      { adminIds: [] },
    );

    const emails = action.build().emails || [];

    expect(emails).toHaveLength(2);
    expect(emails.every((email) => email.html.includes('Quote Reference'))).toBe(true);
    expect(emails.some((email) => email.html.includes('Tracking ID'))).toBe(false);
  });
});
