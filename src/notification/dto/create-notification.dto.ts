import { Notification } from '../entities/notification.entity';

export type CreateNotificationDto = Pick<
  Notification,
  'message' | 'user' | 'action' | 'entity' | 'url'
>;
