import { Controller, Param, Req, Query, HttpStatus } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { BaseController } from 'src/common/base.controller';
import { PaginatedActivitiesDto } from './dto/paginated-activities.dto';
import { ActivityQueryDto } from './dto/activity-query.dot';
import { Activity } from './entities/activity.entity';
import { Get } from 'src/common/decorators/http.decorator';
import { Role } from 'src/roles/roles.decorator';

@Controller('activity')
export class ActivityController extends BaseController {
  constructor(private readonly activityService: ActivityService) {
    super();
  }

  @Get('/', { response: PaginatedActivitiesDto, status: HttpStatus.OK })
  async find(
    @Query() query: ActivityQueryDto,
    @Req() req: Express.Request,
  ): Promise<PaginatedActivitiesDto> {
    const result = await this.activityService.find(
      query,
      req.user.roles.includes(Role.SUPER_ADMIN) ? query.user_id : req.user.sub,
    );
    return new PaginatedActivitiesDto(result, query);
  }

  @Get('/:id', { response: Activity, status: HttpStatus.OK })
  async findOne(@Param('id') id: string, @Req() req: Express.Request): Promise<Activity> {
    const activity = await this.activityService.findOne(id);
    await this.authorize(
      this.or(req.user.roles.includes(Role.SUPER_ADMIN), activity.user.toString() === req.user.sub),
    );
    return activity;
  }
}
