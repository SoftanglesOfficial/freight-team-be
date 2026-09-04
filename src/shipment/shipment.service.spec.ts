import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentSchema } from './entities/shipment.entity';
import { ShipmentService } from './shipment.service';
import { ShipmentStatusUpdatedAction } from './actions/shipment-status-updated.action';

const chain = (value: unknown) => ({
  populate: jest.fn().mockReturnThis(),
  orFail: jest.fn().mockResolvedValue(value),
});

describe('ShipmentService manual identifiers', () => {
  const shipmentModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };
  const documentModel = { updateMany: jest.fn(), find: jest.fn() };
  const quoteRequestModel = {};
  const eventEmitter = { emitAsync: jest.fn() };
  const requestContext = {
    getUser: jest.fn().mockReturnValue({
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
    }),
    getSystemUser: jest.fn(),
  };
  const userService = {
    findByEmailOrDefault: jest.fn(),
    createCustomer: jest.fn(),
    findAllAdminIds: jest.fn().mockResolvedValue([]),
  };
  const documentService = { emitUploadEmailsForDocuments: jest.fn() };

  let service: ShipmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ShipmentService(
      shipmentModel as any,
      documentModel as any,
      quoteRequestModel as any,
      eventEmitter as any,
      requestContext as any,
      userService as any,
      documentService as any,
    );
  });

  it('accepts a new shipment without estimated delivery date', async () => {
    const dto = plainToInstance(CreateShipmentDto, {
      customer: { name: 'Customer' },
      origin_address: { zip_code: '90001' },
      destination_address: { zip_code: '10001' },
      carrierName: 'Carrier',
      dateOfOrder: '2026-08-08',
      timeSensitive: 'no',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('estimatedDeliveryDate');
  });

  it('accepts a new shipment without FTL or PRO numbers', async () => {
    const dto = plainToInstance(CreateShipmentDto, {
      customer: { name: 'Customer' },
      origin_address: { zip_code: '90001' },
      destination_address: { zip_code: '10001' },
      carrierName: 'Carrier',
      dateOfOrder: '2026-08-08',
      estimatedDeliveryDate: '2026-08-12',
      timeSensitive: 'no',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('ftlWareHouseId');
    expect(errors.map((error) => error.property)).not.toContain('proNumber');
  });

  it('creates a pending shipment without estimated delivery date', async () => {
    shipmentModel.create.mockImplementation(async (data) => ({ _id: 'shipment-1', ...data }));

    await service.create({
      customer: { name: 'Customer' },
      origin_address: { zip_code: '90001' },
      destination_address: { zip_code: '10001' },
      carrierName: 'Carrier',
      dateOfOrder: '2026-08-08',
      timeSensitive: 'no',
    } as CreateShipmentDto);

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        estimatedDeliveryDate: expect.anything(),
      }),
    );
  });

  it('creates a pending shipment without generating identifiers', async () => {
    shipmentModel.create.mockImplementation(async (data) => ({ _id: 'shipment-1', ...data }));

    await service.create({
      customer: { name: 'Customer' },
      origin_address: { zip_code: '90001' },
      destination_address: { zip_code: '10001' },
      carrierName: 'Carrier',
      dateOfOrder: '2026-08-08',
      estimatedDeliveryDate: '2026-08-12',
      timeSensitive: 'no',
    } as CreateShipmentDto);

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        proNumber: expect.anything(),
        ftlWareHouseId: expect.anything(),
        pickupDate: expect.anything(),
      }),
    );
    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('transitions and emails once when Pickup Date is first saved manually', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ _id: 'shipment-1', status: 'pending' } as any);
    const updated = {
      _id: 'shipment-1',
      status: 'in-transit',
      pickupDate: new Date('2026-08-09'),
    };
    shipmentModel.findByIdAndUpdate.mockReturnValue(chain(updated));

    await service.update('shipment-1', { pickupDate: '2026-08-09' });

    expect(shipmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'shipment-1',
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'in-transit' }),
        $push: expect.objectContaining({
          status_history: expect.objectContaining({ status: 'in-transit' }),
        }),
      }),
      { new: true },
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
  });

  it('records and emails the transition when Pickup Date is supplied on manual create', async () => {
    shipmentModel.create.mockImplementation(async (data) => ({ _id: 'shipment-1', ...data }));

    await service.create({
      customer: { name: 'Customer' },
      origin_address: { zip_code: '90001' },
      destination_address: { zip_code: '10001' },
      carrierName: 'Carrier',
      dateOfOrder: '2026-08-08',
      pickupDate: '2026-08-09',
      estimatedDeliveryDate: '2026-08-12',
      timeSensitive: 'no',
    } as CreateShipmentDto);

    expect(shipmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'in-transit',
        status_history: expect.arrayContaining([expect.objectContaining({ status: 'in-transit' })]),
      }),
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emitAsync.mock.calls[1][1]).toBeInstanceOf(ShipmentStatusUpdatedAction);
  });

  it('does not repeat the transition or email when Pickup Date already exists', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      _id: 'shipment-1',
      status: 'in-transit',
      pickupDate: new Date('2026-08-09'),
    } as any);
    shipmentModel.findByIdAndUpdate.mockReturnValue(
      chain({
        _id: 'shipment-1',
        status: 'in-transit',
        pickupDate: new Date('2026-08-09'),
      }),
    );

    await service.update('shipment-1', { pickupDate: '2026-08-09' });

    const update = shipmentModel.findByIdAndUpdate.mock.calls[0][1];
    expect(update.$push).toBeUndefined();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('does not allow an initial in-transit status without Pickup Date', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ _id: 'shipment-1', status: 'pending' } as any);
    shipmentModel.findByIdAndUpdate.mockReturnValue(
      chain({ _id: 'shipment-1', status: 'pending' }),
    );
    shipmentModel.findById.mockReturnValue(chain({ _id: 'shipment-1', status: 'pending' }));

    await service.update('shipment-1', { status: 'in-transit' });

    expect(shipmentModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('looks up public FTL numbers by ftlWareHouseId', async () => {
    shipmentModel.findOne.mockReturnValue(chain({ _id: 'shipment-1' }));

    await service.findByFtlId('FTL-123');

    expect(shipmentModel.findOne).toHaveBeenCalledWith({ ftlWareHouseId: 'FTL-123' });
  });

  it('sorts findAll results by updatedAt descending', async () => {
    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockReturnThis();
    const execMock = jest.fn().mockResolvedValue([]);

    shipmentModel.find.mockReturnValue({
      sort: sortMock,
      skip: skipMock,
      limit: limitMock,
      populate: populateMock,
      exec: execMock,
    });
    shipmentModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.findAll({ skip: 0, pageSize: 10 } as any);

    expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1 });
  });

  it('defines a unique partial index for non-empty PRO numbers', () => {
    expect(ShipmentSchema.indexes()).toContainEqual([
      { proNumber: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { proNumber: { $type: 'string', $gt: '' } },
      }),
    ]);
  });
});
