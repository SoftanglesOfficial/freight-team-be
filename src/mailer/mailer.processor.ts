import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { EmailOptions } from './interface/email-options.interface';

@Injectable()
@Processor('mailer')
export class MailerProcessor extends WorkerHost {
  private readonly logger = new Logger(MailerProcessor.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not set — outbound emails will fail');
    }

    this.resend = new Resend(apiKey);
    this.fromAddress = this.configService.get<string>(
      'MAIL_FROM',
      'Freight Team <noreply@ftlwarehouse.com>',
    );
  }

  async process(job: Job<EmailOptions>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} to ${Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to}`,
    );

    try {
      const to = this.toArray(job.data.to);
      const cc = job.data.cc ? this.toArray(job.data.cc) : undefined;
      const bcc = job.data.bcc ? this.toArray(job.data.bcc) : undefined;

      if (!job.data.html && !job.data.text) {
        this.logger.error(`Email job ${job.id} has no html or text content`);
        return;
      }

      const idempotencyKey =
        job.data.idempotencyKey || (job.id != null ? String(job.id) : undefined);

      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        cc,
        bcc,
        subject: job.data.subject,
        ...(job.data.html ? { html: job.data.html } : { text: job.data.text! }),
        ...(job.data.html && job.data.text ? { text: job.data.text } : {}),
        attachments: job.data.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content:
            attachment.content instanceof Buffer
              ? attachment.content
              : Buffer.from(attachment.content),
          contentType: attachment.contentType,
        })),
        // Same Bull job retry → same Resend key → no duplicate customer email
        ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
      } as any);

      if (error) {
        this.logger.error(`Email job ${job.id} failed:`, error);
        // Throw so Bull can retry transport failures; Resend idempotency
        // prevents the customer from receiving duplicates on retry.
        throw new Error(
          typeof error === 'object' && error && 'message' in error
            ? String((error as { message: string }).message)
            : 'Email send failed',
        );
      }

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      throw error;
    }
  }

  onCompleted(job: Job<EmailOptions>): void {
    this.logger.log(`Email job ${job.id} completed successfully`);
  }

  onFailed(job: Job<EmailOptions>, err: Error): void {
    this.logger.error(`Email job ${job.id} failed:`, err);
  }

  private toArray(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}
