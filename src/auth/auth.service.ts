import * as bcrypt from 'bcryptjs';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { User } from 'src/user/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from 'src/roles/roles.decorator';
import { AuthDto } from './dto/auth.dto';
import { RequestUser } from './strategies/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { SigninDto } from './dto/signin.dto';
import { UserService } from 'src/user/user.service';

export type OAuthProvider = 'google' | 'facebook';

export type OAuthProfile = {
  provider: OAuthProvider;
  email?: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async handleSocialLogin(provider: OAuthProvider, payload?: OAuthProfile) {
    if (!payload?.email) {
      throw new UnauthorizedException(`Unable to retrieve email from ${provider}`);
    }

    let user = await this.userService.findByEmailOrDefault(payload.email);

    if (!user) {
      const placeholderPassword = this.generatePlaceholderPassword(),
        user = await this.userService.createUser({
          first_name: payload.firstName ?? 'New',
          last_name: payload.lastName ?? 'User',
          email: payload.email,
          password: placeholderPassword,
          roles: [Role.STANDARD_USER],
          provider,
        });
    } else {
      user = await this.userService.update(user._id.toString(), {
        first_name: payload.firstName ?? user.first_name,
        last_name: payload.lastName ?? user.last_name,
        provider,
      });
    }

    return this.signUser(user!, { dispatchAction: true });
  }

  private generatePlaceholderPassword() {
    return `oauth-${Math.random().toString(36).slice(2)}`;
  }

  signUser(user: User, options?: { dispatchAction?: boolean }): AuthDto {
    const payload: RequestUser = {
      sub: user._id.toString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name ?? '',
      roles: user.roles,
      provider: user.provider,
    };

    const response: AuthDto = {
      access_token: this.jwtService.sign(payload),
      user: user.toObject(),
    };

    if (options?.dispatchAction) {
      // this.eventEmitter.emit('action', new UserSignedInAction(user));
    }

    return response;
  }
}
