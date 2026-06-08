import { Injectable } from '@nestjs/common';
import { PublicChatService } from './public-chat.service';

@Injectable()
export class ChatCleanupService {
  constructor(private readonly publicChatService: PublicChatService) {}

  // Manual cleanup method - can be called from a cron job or scheduled task
  async cleanupInactiveAnonymousUsers(): Promise<void> {
    this.publicChatService.cleanupInactiveUsers();
  }
}
