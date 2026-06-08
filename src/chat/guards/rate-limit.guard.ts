import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = 10; // Max requests per window
  private readonly windowMs = 60000; // 1 minute window

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress || 'unknown';

    // For public chat endpoints, also consider the anonymous user ID
    const anonymousUserId = request.body?.anonymous_user_id || request.query?.anonymous_user_id;
    const key = anonymousUserId ? `${clientIp}:${anonymousUserId}` : clientIp;

    const now = Date.now();
    const windowStart = now - this.windowMs;

    let userRequests = this.requests.get(key);

    if (!userRequests || userRequests.resetTime < now) {
      // Reset or create new window
      userRequests = { count: 1, resetTime: now + this.windowMs };
      this.requests.set(key, userRequests);
    } else {
      userRequests.count++;

      if (userRequests.count > this.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
