import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { User } from '../entities/user.entity';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

export class UserCreatedAction extends Action<User | null, User> {
  private readonly configService = new ConfigService();

  /**
   * @param actor        The admin or system user who created the account (null = system)
   * @param data         The newly-created User document
   * @param changes      Optional – pass { plainPassword } so the welcome email can include it
   */
  constructor(actor: User | null, data: User, changes?: Record<string, any>) {
    super(actor as any, data, changes);
  }

  build(): IAction {
    const loginUrl = `${this.configService.get<string>('NEXT_PUBLIC_FRONTEND_URL')}/auth/login`;
    const fullName =
      [this.data.first_name, this.data.last_name].filter(Boolean).join(' ') || 'Customer';
    const plainPassword: string | undefined = this.changes?.plainPassword;
    const actorName = this.actor ? `${(this.actor as any).first_name ?? 'Admin'}` : 'System';

    // Build email body
    let builder = this.htmlBuilder
      .hello(fullName)
      .heading(2, 'Welcome to Freight Team Logistics!')
      .line('Your professional freight management account has been created. You can now track shipments, manage documents, and request quotes directly from your portal.')
      .space()
      .line('<strong>Your Account Credentials:</strong>')
      .line(`Email Address: <strong>${this.data.email}</strong>`);

    if (plainPassword) {
      builder = builder.line(`Temporary Password: <strong>${plainPassword}</strong>`);
    }

    builder = builder
      .space()
      .line('For security reasons, we recommend changing your password after your first login.')
      .space()
      .button('Access Your Portal', loginUrl, 'primary')
      .space()
      .line('If the button above doesn\'t work, copy and paste this link into your browser:')
      .link(loginUrl, loginUrl);

    const emailHtml = builder.build();

    return {
      activity: this.actor
        ? {
            user: new Types.ObjectId((this.actor as any)._id ?? (this.actor as any).sub),
            action: ActionType.CREATE,
            entity: {
              type: User.name,
              _id: this.data._id,
              title: `User – ${fullName}`,
            },
            message: `${actorName} created a new customer account for ${fullName} (${this.data.email})`,
          }
        : undefined,

      notifications: [],

      emails: [
        {
          adminCc: true,
          priority: 'high' as const,
          to: this.data.email,
          subject: 'Welcome to Freight Team Logistics – Your Account Details',
          html: emailHtml,
          idempotencyKey: `user-created-${this.data._id.toString()}`,
        },
      ],

      socketEvents: [],
    };
  }
}
