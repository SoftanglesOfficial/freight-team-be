import { Action, ActionType, IAction } from 'src/common/class/action.class';
import { UserSecret } from '../entities/user-secret.entity';
import { User } from 'src/user/entities/user.entity';

export class UserRequestedSecretAction extends Action<User, [UserSecret, string]> {
  build(): IAction {
    const [userSecret, secret] = this.data;
    return {
      activity: {
        action: ActionType.CREATE,
        entity: {
          type: UserSecret.name,
          _id: userSecret._id,
          title: 'User Secret',
        },
        message: `${this.actor.first_name} requested a ${userSecret.type} secret`,
        user: this.actor._id,
      },
      emails: [
        {
          adminCc: false,
          to: this.actor.email,
          subject: `${userSecret.type} request for ${userSecret.intent}`,
          html: this.htmlBuilder
            .hello(this.actor.first_name)
            .line(`You requested a ${userSecret.type} secret`)
            .line(`Your secret is: <b>${secret}</b>`)
            .build(),
        },
      ],
    };
  }
}
