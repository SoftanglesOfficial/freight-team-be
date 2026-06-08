import { Types } from 'mongoose';
import { EntityInfo } from '../entities/activity.entity';

export class CreateActivityDto {
  action: string;
  entity: EntityInfo;
  user_id: Types.ObjectId;
  change?: Record<string, any>;
}
