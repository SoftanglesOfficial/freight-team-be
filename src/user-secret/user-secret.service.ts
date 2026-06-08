import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserSecretDto } from './dto/create-user-secret.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSecret } from './entities/user-secret.entity';
import * as bcrypt from 'bcryptjs';
import { ValidateUserSecretDto } from './dto/validate-user-secret.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRequestedSecretAction } from './actions/user-requested-secret.action';
import { UserService } from 'src/user/user.service';

export enum UserSecretType {
  OTP = 'Otp',
  LINK = 'Link',
  TOKEN = 'Token',
}

@Injectable()
export class UserSecretService {
  constructor(
    @InjectModel(UserSecret.name) readonly userSecretModel: Model<UserSecret>,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
  ) {}
  async create(data: CreateUserSecretDto): Promise<string> {
    const user = await this.userService.findByEmailOrFail(data.email);

    let secret = Math.random().toString(36).slice(2, 32); //random string of length 32
    if (data.type === UserSecretType.OTP) {
      secret = Math.floor(100000 + Math.random() * 900000).toString();
    }
    await this.delete(data.email, data.intent);
    const userSecret = await this.userSecretModel.create({
      ...data,
      secret: bcrypt.hashSync(secret, 10),
    });
    this.eventEmitter.emit('action', new UserRequestedSecretAction(user, [userSecret, secret]));
    return secret;
  }

  async validate(data: ValidateUserSecretDto) {
    const userSecret = await this.userSecretModel
      .findOne({ email: data.email, intent: data.intent })
      .orFail(new BadRequestException('Secret is invalid or expired'));
    if (!bcrypt.compareSync(data.secret, userSecret.secret)) {
      throw new BadRequestException('Secret is invalid or expired');
    }
    return userSecret;
  }

  private async delete(email: string, intent: string) {
    await this.userSecretModel.deleteMany({ email, intent });
  }

  async consume(data: ValidateUserSecretDto) {
    await this.validate(data);
    await this.delete(data.email, data.intent);
  }
}
