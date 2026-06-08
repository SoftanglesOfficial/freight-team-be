import { Activity } from 'src/activity/entities/activity.entity';
import { EmailOptions } from 'src/mailer/interface/email-options.interface';
import { Notification } from 'src/notification/entities/notification.entity';
import { HtmlBuilder } from './html-builder.class';
import { ISocketEvent } from 'src/common/interfaces/socket-event.interface';
import { User } from 'src/user/entities/user.entity';

export const ACTION_EVENT = 'action';

export enum ActionType {
  READ = 'Read',
  CREATE = 'Create',
  UPDATE = 'Update',
  DELETE = 'Delete',
  UPLOAD = 'Upload',
  DOWNLOAD = 'Download',
  ASSIGN = 'Assign',
  UNASSIGN = 'Unassign',
  REVIEW = 'Review',
  INVITE = 'Invite',
  JOIN = 'Join',
  LEAVE = 'Leave',
  FOLLOW = 'Follow',
  UNFOLLOW = 'Unfollow',
  LIKE = 'Like',
  UNLIKE = 'Unlike',
  SHARE = 'Share',
  UNSHARE = 'Unshare',
  REPORT = 'Report',
  BLOCK = 'Block',
  UNBLOCK = 'Unblock',
  REQUEST = 'Request',
  ACCEPT = 'Accept',
  APPROVE = 'Approve',
  REJECT = 'Reject',
  CANCEL = 'Cancel',
  COMPLETE = 'Complete',
  COMMENT = 'Comment',
  REPLY = 'Reply',
}

export interface IAction {
  activity?: Pick<Activity, 'action' | 'entity' | 'change' | 'message' | 'user'>;
  notifications?: Pick<Notification, 'message' | 'user' | 'action' | 'entity' | 'url'>[];
  socketEvents?: ISocketEvent[];
  emails?: EmailOptions[];
}

export abstract class Action<TActor, D> {
  activity?: Activity;
  notifications?: Notification[];
  socketEvents?: ISocketEvent[];
  emails?: EmailOptions[];
  changes?: Record<string, any>;
  actor: TActor;
  data: D;
  ccUsers: User[] = [];

  get htmlBuilder(): HtmlBuilder {
    return new HtmlBuilder();
  }

  constructor(actor: TActor, data: D, changes?: Record<string, any>) {
    this.actor = actor;
    this.data = data;
    this.changes = changes;
  }

  abstract build(): IAction | Promise<IAction>;
}
