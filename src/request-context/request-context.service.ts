import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { UserService } from 'src/user/user.service';

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<{ user: RequestUser }>();

  constructor(private readonly userService: UserService) {}

  run<T>(user: RequestUser, callback: () => T): T {
    return this.als.run({ user }, callback);
  }

  getUser(): RequestUser {
    const context = this.als.getStore();
    if (!context) {
      throw new Error('Request context not found');
    }
    return context.user;
  }

  getUserId(): string {
    return this.getUser().sub;
  }

  async getSystemUser(): Promise<RequestUser> {
    const systemUser = await this.userService.getOrCreateSystemUser();
    return {
      sub: systemUser._id.toString(),
      first_name: systemUser.first_name,
      last_name: systemUser.last_name || '',
      email: systemUser.email,
      roles: systemUser.roles,
      provider: systemUser.provider,
    };
  }
}
