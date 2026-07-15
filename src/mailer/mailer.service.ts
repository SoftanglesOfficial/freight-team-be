import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Queue } from 'bullmq';
import { EmailOptions } from './interface/email-options.interface';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  constructor(@InjectQueue('mailer') private mailQueue: Queue) {}

  async dispatch(...emails: EmailOptions[]): Promise<void> {
    const jobs = emails.map((email) => {
      const idempotencyKey = email.idempotencyKey || this.buildIdempotencyKey(email);
      return {
        name: 'send-email',
        data: { ...email, idempotencyKey },
        opts: {
          // Same logical email won't be queued twice (double submit / double emit)
          jobId: idempotencyKey,
          priority: this.getPriorityLevel(email.priority),
          delay: email.delay || 0,
        },
      };
    });

    try {
      await this.mailQueue.addBulk(jobs);
      this.logger.log(`Queued ${emails.length} emails for processing`);
    } catch (error) {
      // Bull rejects duplicate jobIds — treat as already queued, not a hard failure
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Job') && message.includes('exists')) {
        this.logger.warn(`Skipped duplicate email job(s): ${message}`);
        return;
      }
      throw error;
    }
  }

  private buildIdempotencyKey(email: EmailOptions): string {
    const to = Array.isArray(email.to) ? email.to.sort().join(',') : email.to;
    const raw = `${to}|${email.subject}|${email.html?.slice(0, 200) || email.text?.slice(0, 200) || ''}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
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
