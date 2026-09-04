import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { GoogleSheetsService, GoogleSheetRow } from './google-sheets.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('webhooks/google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  // Webhook endpoint — Apps Script calls this on every sheet save. Now that it
  // can write customer info and status changes (not just notes/ETA), it must
  // be authenticated — anyone who guesses this URL could otherwise edit any
  // shipment. Set GOOGLE_SHEETS_WEBHOOK_SECRET and put the same value in the
  // Apps Script's WEBHOOK_SECRET constant.
  @Public()
  @Post()
  async receiveWebhook(
    @Body() body: { rows: GoogleSheetRow[]; secret?: string },
    @Headers('x-webhook-secret') headerSecret?: string,
  ): Promise<{ success: boolean; updated: number; skipped: number }> {
    const expected = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
    if (expected && body?.secret !== expected && headerSecret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

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
