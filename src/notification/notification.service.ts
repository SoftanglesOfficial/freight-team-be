import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { NotificationQueryDto } from './dto/notification-query.dot';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto[]): Promise<[Notification[], number]> {
    const notifications = await this.notificationModel.insertMany(createNotificationDto);
    const filter = {
      _id: { $in: notifications.map((notification) => notification._id) },
    };
    return await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate('user', 'first_name last_name email'),
      this.notificationModel.countDocuments(filter),
    ]);
  }

  async findUnseen(user_id: string): Promise<[Notification[], number]> {
    const filter: FilterQuery<Notification> = {
      user: new Types.ObjectId(user_id),
      seen: false,
    };
    return await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate('user', 'first_name last_name email'),
      this.notificationModel.countDocuments(filter),
    ]);
  }

  async find(user_id: string, query: NotificationQueryDto): Promise<[Notification[], number]> {
    const { seen } = query;
    const filter: FilterQuery<Notification> = {
      ...(user_id ? { user: new Types.ObjectId(user_id) } : {}),
      ...(seen ? { seen } : {}),
    };

    return await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize)
        .populate('user', 'first_name last_name email'),
      // count documents with the same filter
      this.notificationModel.countDocuments(filter),
    ]);
  }

  async findOne(id: string): Promise<Notification> {
    return await this.notificationModel
      .findById(new Types.ObjectId(id))
      .orFail(new NotFoundException('Notification not found'))
      .populate('user', 'first_name last_name email');
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    return await this.notificationModel
      .findByIdAndUpdate(new Types.ObjectId(id), updateNotificationDto, {
        new: true,
      })
      .orFail(new NotFoundException('Notification not found'))
      .populate('user', 'first_name last_name email');
  }

  async remove(id: string): Promise<Notification> {
    return await this.notificationModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .orFail(new NotFoundException('Notification not found'))
      .populate('user', 'first_name last_name email');
  }
}
