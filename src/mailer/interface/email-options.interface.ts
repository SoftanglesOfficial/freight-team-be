export interface EmailOptions {
  adminCc: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  delay?: number;
  /** Prevents duplicate sends when Bull retries or the same event fires twice */
  idempotencyKey?: string;
}
