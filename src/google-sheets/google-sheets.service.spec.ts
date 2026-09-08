import { GoogleSheetsService } from './google-sheets.service';

describe('GoogleSheetsService shipment dates', () => {
  const shipmentModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    collection: { updateOne: jest.fn().mockResolvedValue(undefined) },
  };
  const eventEmitter = { emitAsync: jest.fn() };
  const requestContext = { getSystemUser: jest.fn() };
  let service: GoogleSheetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    shipmentModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: 'shipment-1',
        proNumber: 'PRO-123',
        status: 'in-transit',
      }),
    });
    requestContext.getSystemUser.mockResolvedValue({ email: 'system@example.com' });
    service = new GoogleSheetsService(
      shipmentModel as any,
      eventEmitter as any,
      requestContext as any,
    );
  });

  it('fills in Pickup Date only when not already set, and flips status to in-transit (same as a manual site edit)', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
    });

    const result = await service.syncFromWebhook([
      {
        proNumber: 'PRO-123',
        pickupDate: '2026-08-09',
        eta: '2026-08-12',
      },
    ]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      {
        $set: expect.objectContaining({
          estimatedDeliveryDate: new Date('2026-08-12'),
          pickupDate: new Date('2026-08-09'),
          status: 'in-transit',
          status_history: [
            expect.objectContaining({ status: 'in-transit', updatedBy: 'Google Sheets Sync' }),
          ],
        }),
      },
    );
    expect(result).toEqual({ updated: 1, skipped: 0 });
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
  });

  it('does not flip status when Pickup Date is already set on the shipment', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
      pickupDate: new Date('2026-08-01'),
    });

    await service.syncFromWebhook([
      { proNumber: 'PRO-123', pickupDate: '2026-08-09', eta: '2026-08-12' },
    ]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      { $set: { estimatedDeliveryDate: new Date('2026-08-12') } },
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });


  it('preserves delivered transition and email from Actual Delivered', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'in-transit',
      status_history: [],
      notes: [],
    });
    shipmentModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: 'shipment-1',
        proNumber: 'PRO-123',
        status: 'delivered',
      }),
    });
    requestContext.getSystemUser.mockResolvedValue({ email: 'system@example.com' });

    await service.syncFromWebhook([{ proNumber: 'PRO-123', actualDelivered: '2026-08-10' }]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      {
        $set: expect.objectContaining({
          deliveryDate: new Date('2026-08-10'),
          status: 'delivered',
          status_history: [
            expect.objectContaining({
              status: 'delivered',
              updatedBy: 'Google Sheets Sync',
            }),
          ],
        }),
      },
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
  });

  it('fills in Order # and Invoice # only when not already set on the shipment', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      poNumber: 'EXISTING-PO',
      status_history: [],
      notes: [],
    });

    await service.syncFromWebhook([
      { proNumber: 'PRO-123', orderNumber: 'ORDER-999', invoiceNumber: 'INV-1' },
    ]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      { $set: { invoiceNumber: 'INV-1' } },
    );
  });

  it('syncs an explicit Status column and fires the status email', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
    });
    shipmentModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: 'shipment-1',
        proNumber: 'PRO-123',
        status: 'in-transit',
      }),
    });

    const result = await service.syncFromWebhook([
      { proNumber: 'PRO-123', status: 'In Transit' },
    ]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      {
        $set: expect.objectContaining({
          status: 'in-transit',
          status_history: [
            expect.objectContaining({ status: 'in-transit', updatedBy: 'Google Sheets Sync' }),
          ],
        }),
      },
    );
    expect(result).toEqual({ updated: 1, skipped: 0 });
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
  });

  it('ignores an unrecognized Status value', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
    });

    const result = await service.syncFromWebhook([
      { proNumber: 'PRO-123', status: 'On The Moon' },
    ]);

    expect(shipmentModel.updateOne).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: 0, skipped: 1 });
  });

  it('fills in customer info only for fields not already on file', async () => {
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
      customer: { name: 'Existing Name' },
    });

    await service.syncFromWebhook([
      {
        proNumber: 'PRO-123',
        customerName: 'Sheet Name',
        customerEmail: 'sheet@example.com',
      },
    ]);

    expect(shipmentModel.updateOne).toHaveBeenCalledWith(
      { _id: 'shipment-1' },
      { $set: { 'customer.email': 'sheet@example.com' } },
    );
  });

  it('CSV sync only processes rows that match known shipment identifiers', async () => {
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'sheet-test-id';
    const csvService = new GoogleSheetsService(
      shipmentModel as any,
      eventEmitter as any,
      requestContext as any,
    );

    const csv = [
      'PRO,ETA,NOTES',
      'UNKNOWN-1,2026-08-12,skip me',
      'PRO-123,2026-08-15,keep me',
      'UNKNOWN-2,2026-08-12,skip me too',
    ].join('\n');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => csv,
    }) as any;

    shipmentModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { proNumber: 'PRO-123', ftlWareHouseId: null, poNumber: null, invoiceNumber: null },
      ]),
    });
    shipmentModel.findOne.mockResolvedValue({
      _id: 'shipment-1',
      proNumber: 'PRO-123',
      status: 'pending',
      status_history: [],
      notes: [],
    });

    const result = await csvService.syncFromCsv();

    expect(shipmentModel.findOne).toHaveBeenCalledTimes(1);
    expect(shipmentModel.findOne).toHaveBeenCalledWith({
      $or: expect.arrayContaining([
        { proNumber: { $regex: '^PRO-123$', $options: 'i' } },
      ]),
    });
    expect(result.updated + result.skipped).toBe(1);
  });
});
