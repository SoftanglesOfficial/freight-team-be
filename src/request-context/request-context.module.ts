import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextInterceptor } from './request-context.interceptor';
import { UserModule } from 'src/user/user.module';

@Global()
@Module({
  imports: [UserModule],
  providers: [
    RequestContextService,
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
  exports: [RequestContextService],
})
export class RequestContextModule {}
