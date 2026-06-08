import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Activity } from './entities/activity.entity';
import { ActivityQueryDto } from './dto/activity-query.dot';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<Activity>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const activity = await this.activityModel.create(createActivityDto);
    await activity.populate('user');
    return activity;
  }

  async find(
    query: Omit<ActivityQueryDto, 'userId'>,
    userId?: string,
  ): Promise<[Activity[], number]> {
    const { entity_type: entityType, entity_id: entityId, action } = query;
    const filter: FilterQuery<Activity> = {
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
      ...(entityType ? { 'entity.type': entityType } : {}),
      ...(entityId ? { 'entity.id': entityId } : {}),
      ...(action ? { action } : {}),
    };

    return await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize)
        .populate('user'),
      // count documents with the same filter
      this.activityModel.countDocuments(filter),
    ]);
  }

  async findOne(id: string): Promise<Activity> {
    return await this.activityModel
      .findById(new Types.ObjectId(id))
      .orFail(new NotFoundException('Activity not found'))
      .populate('user');
  }
}
