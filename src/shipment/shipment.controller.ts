import { Controller, Body, Patch, Param, Delete, Query, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import { PaginatedShipmentsDto } from './dto/paginated-shipments.dto';
import { TrackingResponseDto } from './dto/tracking-response.dto';
import { Shipment } from './entities/shipment.entity';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles, Role } from 'src/roles/roles.decorator';
import { Get, Post } from 'src/common/decorators/http.decorator';
import { BaseController } from 'src/common/base.controller';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Shipment')
@Controller('shipment')
export class ShipmentController extends BaseController {
  constructor(private readonly shipmentService: ShipmentService) {
    super();
  }

  @Public()
  @Get('/track/:proNumber', {
    response: TrackingResponseDto,
    status: HttpStatus.OK,
    description: 'Get shipment tracking information (public endpoint)',
  })
  async track(@Param('proNumber') proNumber: string): Promise<TrackingResponseDto> {
    return this.shipmentService.getTrackingInfo(proNumber);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/', { response: Shipment, status: HttpStatus.CREATED })
  async create(
    @Body() createShipmentDto: CreateShipmentDto,
    @Req() req: Request,
  ): Promise<Shipment> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.create(createShipmentDto);
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/', { response: PaginatedShipmentsDto, status: HttpStatus.OK })
  async findAll(
    @Query() query: ShipmentQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedShipmentsDto> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    // We let the service handle data isolation based on roles
    // If we forced query.customer_id here, it would prevent customers from seeing
    // shipments only linked by email.

    const results = await this.shipmentService.findAll(query);
    return new PaginatedShipmentsDto(results, query);
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/:id', { response: Shipment, status: HttpStatus.OK })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Shipment> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    const shipment = await this.shipmentService.findOne(id);
    
    if (isStandardUser && !isSuperAdmin) {
      const user = req.user;
      const isOwnerById = shipment.customer_id?.toString() === user.sub;
      const isOwnerByEmail = shipment.customer?.email?.toLowerCase() === user.email?.toLowerCase();
      
      if (!isOwnerById && !isOwnerByEmail) {
        await this.authorize(false);
      }
    }

    return shipment;
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/pro/:proNumber', { response: Shipment, status: HttpStatus.OK })
  async findByFtlId(@Param('proNumber') proNumber: string, @Req() req: Request): Promise<Shipment> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    const shipment = await this.shipmentService.findByFtlId(proNumber);

    if (isStandardUser && !isSuperAdmin) {
      const user = req.user;
      const isOwnerById = shipment.customer_id?.toString() === user.sub;
      const isOwnerByEmail = shipment.customer?.email?.toLowerCase() === user.email?.toLowerCase();

      if (!isOwnerById && !isOwnerByEmail) {
        await this.authorize(false);
      }
    }

    return shipment;
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
    @Req() req: Request,
  ): Promise<Shipment> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.update(id, updateShipmentDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('/:id/update-location')
  @ApiOperation({ summary: 'Update current location of a shipment' })
  async updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: Request,
  ): Promise<Shipment> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.updateLocation(
      id,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
      updateLocationDto.note,
    );
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('/:id/add-note')
  @ApiOperation({ summary: 'Add a manual note to the shipment history' })
  async addNote(
    @Param('id') id: string,
    @Body() addNoteDto: AddNoteDto,
    @Req() req: Request,
  ): Promise<Shipment> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.addNote(id, addNoteDto.note);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post(':id/send-status-email', { response: Object, status: HttpStatus.OK })
  async sendStatusEmail(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { status: 'in-transit' | 'delivered' | 'pending' },
  ): Promise<{ message: string }> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.sendStatusEmail(id, body.status);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete('/:id')
  async remove(@Param('id') id: string, @Req() req: Request): Promise<Shipment> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.shipmentService.remove(id);
  }
}
