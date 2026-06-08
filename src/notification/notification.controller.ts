import { Controller, Body, Param, Query, Req, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dot';
import { BaseController } from 'src/common/base.controller';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { Notification } from './entities/notification.entity';
import { Delete, Get, Patch } from 'src/common/decorators/http.decorator';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';

@Controller('notification')
export class NotificationController extends BaseController {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  @Get('/', { response: PaginatedNotificationsDto, status: HttpStatus.OK })
  async index(
    @Query() query: NotificationQueryDto,
    @Req() req: Express.Request,
  ): Promise<PaginatedNotificationsDto> {
    const result = await this.notificationService.find(req.user.sub, query);
    return new PaginatedNotificationsDto(result, query);
  }

  @Get('/:id', { response: Notification, status: HttpStatus.OK })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: Express.Request,
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(id);
    await this.authorize(notification.user.toString() === req.user.sub);
    return notification;
  }

  @Patch('/:id', { response: Notification, status: HttpStatus.OK })
  async updateOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Req() req: Express.Request,
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(id);
    await this.authorize(notification.user.toString() === req.user.sub);
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete('/:id', { response: Notification, status: HttpStatus.OK })
  async removeOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: Express.Request,
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(id);
    await this.authorize(notification.user.toString() === req.user.sub);
    return this.notificationService.remove(id);
  }
}
