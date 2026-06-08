import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './interface/email-options.interface';

@Injectable()
@Processor('mailer')
export class MailerProcessor extends WorkerHost {
  private readonly logger = new Logger(MailerProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
    this.createTransporter();
  }

  private createTransporter(): void {
    const smtpConfig = {
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      // secure: this.configService.get<boolean>('MAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async process(job: Job<EmailOptions>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} to ${Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to}`,
    );

    try {
      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM'),
        to: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
        cc: job.data.cc
          ? Array.isArray(job.data.cc)
            ? job.data.cc.join(', ')
            : job.data.cc
          : undefined,
        bcc: job.data.bcc
          ? Array.isArray(job.data.bcc)
            ? job.data.bcc.join(', ')
            : job.data.bcc
          : undefined,
        subject: job.data.subject,
        text: job.data.text,
        html: job.data.html,
        attachments: job.data.attachments,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      // Don't throw error to prevent server crash, just log it
      // BullMQ will mark the job as failed automatically
    }
  }

  onCompleted(job: Job<EmailOptions>): void {
    this.logger.log(`Email job ${job.id} completed successfully`);
  }

  onFailed(job: Job<EmailOptions>, err: Error): void {
    this.logger.error(`Email job ${job.id} failed:`, err);
  }
}
