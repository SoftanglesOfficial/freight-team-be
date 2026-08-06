import { Controller, Post, Body, Get } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('webhooks/google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  // Webhook endpoint — Apps Script calls this on every sheet save
  @Public()
  @Post()
  async receiveWebhook(
    @Body() body: { rows: any[] },
  ): Promise<{ success: boolean; updated: number; skipped: number }> {
    if (!body?.rows?.length) {
      return { success: false, updated: 0, skipped: 0 };
    }

    const result = await this.googleSheetsService.syncFromWebhook(body.rows);
    return { success: true, ...result };
  }

  // Manual trigger endpoint — admin can call this to force sync
  @Public()
  @Get('sync-now')
  async manualSync(): Promise<{
    success: boolean;
    updated: number;
    skipped: number;
  }> {
    const result = await this.googleSheetsService.syncFromCsv();
    return { success: true, ...result };
  }
}
