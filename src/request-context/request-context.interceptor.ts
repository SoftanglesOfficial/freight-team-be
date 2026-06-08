// src/common/interceptors/request-context.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Express.Request>();
    const user = request.user;

    if (user) {
      return new Observable((subscriber) => {
        this.requestContext.run(user, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
