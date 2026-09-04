import { QuoteRequestService } from './quote-request.service';

describe('QuoteRequestService', () => {
  const buildService = (quote: Record<string, unknown>) => {
    const quoteModel = {
      findById: jest.fn().mockReturnValue({
        orFail: jest.fn().mockResolvedValue(quote),
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue(undefined),
    };
    const shipmentModel = {
      create: jest.fn().mockImplementation(async (data) => data),
    };
    const sequenceService = { getCode: jest.fn() };
    const eventEmitter = { emitAsync: jest.fn() };
    const requestContext = { getUser: jest.fn().mockReturnValue({}) };
    const userService = {
      findAllAdminIds: jest.fn().mockResolvedValue([]),
      findByEmailOrDefault: jest.fn().mockResolvedValue(undefined),
    };
    const service = new QuoteRequestService(
      quoteModel as any,
      shipmentModel as any,
      sequenceService as any,
      eventEmitter as any,
      requestContext as any,
      userService as any,
    );

    return { service, shipmentModel, sequenceService };
  };

  it('converts an accepted quote without generated identifiers or Pickup Date', async () => {
    const quote = {
      _id: '507f1f77bcf86cd799439011',
      full_name: 'Customer',
      email: 'customer@example.com',
      origin_zip_code: '90001',
      destination_zip_code: '10001',
      tracking_id: 'QTR-123',
      pallets: [],
      toObject: jest.fn().mockReturnThis(),
    };
    const { service, shipmentModel, sequenceService } = buildService(quote);

    await service.acceptAndConvert(quote._id, {
      pickupDate: '2026-08-09',
      estimatedDeliveryDate: '2026-08-12',
    });

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        ftlWareHouseId: expect.anything(),
        proNumber: expect.anything(),
        pickupDate: expect.anything(),
      }),
    );
    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedDeliveryDate: new Date('2026-08-12'),
      }),
    );
    expect(sequenceService.getCode).not.toHaveBeenCalled();
  });

  it('does not use quote delivery_date when converting without explicit estimated delivery date', async () => {
    const quote = {
      _id: '507f1f77bcf86cd799439011',
      full_name: 'Customer',
      email: 'customer@example.com',
      origin_zip_code: '90001',
      destination_zip_code: '10001',
      tracking_id: 'QTR-123',
      delivery_date: new Date('2020-01-01'),
      pallets: [],
      toObject: jest.fn().mockReturnThis(),
    };
    const { service, shipmentModel } = buildService(quote);

    await service.acceptAndConvert(quote._id, {});

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        estimatedDeliveryDate: expect.anything(),
      }),
    );
  });

  it('derives estimated delivery date from estimatedTransitDays when accept form omits it', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-28T12:00:00Z'));

    const quote = {
      _id: '507f1f77bcf86cd799439011',
      full_name: 'Customer',
      email: 'customer@example.com',
      origin_zip_code: '90001',
      destination_zip_code: '10001',
      tracking_id: 'QTR-123',
      delivery_date: new Date('2020-01-01'),
      estimatedTransitDays: 5,
      pallets: [],
      toObject: jest.fn().mockReturnThis(),
    };
    const { service, shipmentModel } = buildService(quote);

    await service.acceptAndConvert(quote._id, {});

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedDeliveryDate: new Date('2026-09-02T12:00:00Z'),
      }),
    );

    jest.useRealTimers();
  });
});
