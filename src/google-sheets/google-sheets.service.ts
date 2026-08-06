import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from 'src/shipment/entities/shipment.entity';
import * as cron from 'node-cron';

@Injectable()
export class GoogleSheetsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  private readonly CSV_URL = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}/export?format=csv&gid=0`;

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
  ) {}

  onModuleInit() {
    if (!this.SHEET_ID) {
      this.logger.warn(
        'GOOGLE_SHEETS_SPREADSHEET_ID not set — Google Sheets sync disabled',
      );
      return;
    }

    // Run immediately on startup
    this.syncFromCsv();

    // Schedule every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.logger.log('Running scheduled Google Sheets CSV sync...');
      this.syncFromCsv();
    });
  }

  async syncFromCsv(): Promise<{ updated: number; skipped: number }> {
    if (!this.SHEET_ID) {
      this.logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not set — skipping CSV sync');
      return { updated: 0, skipped: 0 };
    }

    try {
      const response = await fetch(this.CSV_URL);
      if (!response.ok) {
        this.logger.error(`Failed to fetch CSV: ${response.statusText}`);
        return { updated: 0, skipped: 0 };
      }

      const csv = await response.text();
      const rows = this.parseCsv(csv);

      if (rows.length === 0) {
        this.logger.warn('No rows found in CSV');
        return { updated: 0, skipped: 0 };
      }

      return await this.processRows(rows);
    } catch (error) {
      this.logger.error('CSV sync error:', (error as Error).message);
      return { updated: 0, skipped: 0 };
    }
  }

  async syncFromWebhook(rows: any[]): Promise<{ updated: number; skipped: number }> {
    return this.processRows(rows);
  }

  private async processRows(rows: any[]): Promise<{ updated: number; skipped: number }> {
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const proNumber = row.proNumber?.toString().trim();
      if (!proNumber) {
        skipped++;
        continue;
      }

      // Build update object — only update fields that have values
      const updateData: Record<string, unknown> = {};

      if (row.eta) {
        const etaDate = new Date(row.eta);
        if (!isNaN(etaDate.getTime())) {
          updateData.estimatedDeliveryDate = etaDate;
        }
      }

      if (row.actualDelivered) {
        const deliveredDate = new Date(row.actualDelivered);
        if (!isNaN(deliveredDate.getTime())) {
          updateData.deliveryDate = deliveredDate;
        }
      }

      if (row.notes) {
        updateData.notes = row.notes;
      }

      if (Object.keys(updateData).length === 0) {
        skipped++;
        continue;
      }

      const escapedPro = proNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Find shipment by proNumber (case-insensitive)
      const result = await this.shipmentModel.updateOne(
        { proNumber: { $regex: `^${escapedPro}$`, $options: 'i' } },
        { $set: updateData },
      );

      if (result.matchedCount > 0) {
        updated++;
        this.logger.log(`Updated shipment ${proNumber}: ${JSON.stringify(updateData)}`);
      } else {
        skipped++;
        this.logger.warn(`No shipment found for PRO: ${proNumber}`);
      }
    }

    this.logger.log(`Sync complete: ${updated} updated, ${skipped} skipped`);
    return { updated, skipped };
  }

  private parseCsv(csv: string): any[] {
    const lines = csv.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);

    // Find column indexes
    const proCol = headers.findIndex((h) => h.trim().toUpperCase() === 'PRO');
    const etaCol = headers.findIndex((h) => h.trim().toUpperCase() === 'ETA');
    const actualDeliveredCol = headers.findIndex((h) =>
      h.trim().toLowerCase().includes('actual delivered'),
    );
    const notesCol = headers.findIndex((h) => h.trim().toUpperCase() === 'NOTES');

    if (proCol === -1) {
      this.logger.error('PRO column not found in CSV headers');
      return [];
    }

    const rows: Array<{
      proNumber: string;
      eta: string;
      actualDelivered: string;
      notes: string;
    }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const proNumber = cols[proCol]?.trim();
      if (!proNumber) continue;

      rows.push({
        proNumber,
        eta: etaCol !== -1 ? cols[etaCol]?.trim() : '',
        actualDelivered: actualDeliveredCol !== -1 ? cols[actualDeliveredCol]?.trim() : '',
        notes: notesCol !== -1 ? cols[notesCol]?.trim() : '',
      });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}
