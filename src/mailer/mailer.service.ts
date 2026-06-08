import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EmailOptions } from './interface/email-options.interface';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  constructor(@InjectQueue('mailer') private mailQueue: Queue) {}

  async dispatch(...emails: EmailOptions[]): Promise<void> {
    await this.mailQueue.addBulk(
      emails.map((email) => ({
        name: 'send-email',
        data: email,
        opts: {
          priority: this.getPriorityLevel(email.priority),
          delay: email.delay || 0,
        },
      })),
    );
    this.logger.log(`Queued ${emails.length} emails for processing`);
  }

  private getPriorityLevel(priority?: 'low' | 'normal' | 'high' | 'critical'): number {
    switch (priority) {
      case 'low':
        return 10;
      case 'normal':
        return 5;
      case 'high':
        return 1;
      case 'critical':
        return 0;
      default:
        return 5; // normal priority
    }
  }
}
