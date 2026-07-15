import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { MailerProcessor } from './mailer.processor';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'mailer',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        // Keep a single retry for true transport failures, but Resend
        // idempotency keys prevent duplicate customer emails on retry.
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  providers: [MailerService, MailerProcessor],
  exports: [MailerService],
})
export class MailerModule {}
