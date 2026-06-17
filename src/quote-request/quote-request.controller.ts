import { Controller, Body, Patch, Param, Delete, Query, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { QuoteRequestService } from './quote-request.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';
import { QuoteRequestQueryDto } from './dto/quote-request-query.dto';
import { PaginatedQuoteRequestsDto } from './dto/paginated-quote-requests.dto';
import { QuoteRequest } from './entities/quote-request.entity';
import { Public } from 'src/common/decorators/public.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuoteRequestCreatedAction } from './actions/quote-request-created.action';
import { Roles, Role } from 'src/roles/roles.decorator';
import { Get, Post } from 'src/common/decorators/http.decorator';
import { BaseController } from 'src/common/base.controller';
import { QuoteRequestUpdatedAction } from './actions/quote-request-updated.action';
import { Shipment } from 'src/shipment/entities/shipment.entity';

@Controller('quote-request')
export class QuoteRequestController extends BaseController {
  constructor(
    private readonly quoteRequestService: QuoteRequestService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  @Public()
  @Get('/tracking/:trackingId', {
    response: QuoteRequest,
    status: HttpStatus.OK,
  })
  async track(@Param('trackingId') trackingId: string): Promise<QuoteRequest> {
    return this.quoteRequestService.findByTrackingId(trackingId);
  }

  @Public()
  @Post('/', { response: QuoteRequest, status: HttpStatus.CREATED })
  async create(
    @Body() createQuoteRequestDto: CreateQuoteRequestDto,
    @Req() req: Request,
  ): Promise<QuoteRequest> {
    const quote = await this.quoteRequestService.create(createQuoteRequestDto);
    // user might be undefined if public
    const user = req.user;
    await this.eventEmitter.emitAsync('action', new QuoteRequestCreatedAction(user, quote));
    return quote;
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/', { response: PaginatedQuoteRequestsDto, status: HttpStatus.OK })
  async findAll(
    @Query() query: QuoteRequestQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedQuoteRequestsDto> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    if (isStandardUser && !isSuperAdmin) {
      query.email = req.user.email;
    }

    const results = await this.quoteRequestService.findAll(query);
    return new PaginatedQuoteRequestsDto(results, query);
  }

  @Public()
  @Get(':id', { response: QuoteRequest, status: HttpStatus.OK })
  async findOne(@Param('id') id: string): Promise<QuoteRequest> {
    return this.quoteRequestService.findOne(id);
  }

  @Public()
  @Post(':id/decline', { response: QuoteRequest, status: HttpStatus.OK })
  async decline(
    @Param('id') id: string,
    @Body() body: { feedback: any },
  ): Promise<QuoteRequest> {
    return this.quoteRequestService.declineQuote(id, body.feedback);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuoteRequestDto: UpdateQuoteRequestDto,
    @Req() req: Request,
  ): Promise<QuoteRequest> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.quoteRequestService.update(id, updateQuoteRequestDto);
  }

  @Public()
  @Post(':id/accept', { response: Shipment, status: HttpStatus.OK })
  async acceptAndConvert(@Param('id') id: string, @Body() data: any) {
    return this.quoteRequestService.acceptAndConvert(id, data);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request): Promise<QuoteRequest> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.quoteRequestService.remove(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post(':id/send-email', { response: Object, status: HttpStatus.OK })
  async sendQuoteEmail(
    @Param('id') id: string,
    @Req() req: Request,
    @Body()
    data: { quoteAmount: number; carrier: string; estimatedTransitDays: number; notes?: string },
  ): Promise<{ message: string }> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.quoteRequestService.sendQuote(id, data);
  }
}
