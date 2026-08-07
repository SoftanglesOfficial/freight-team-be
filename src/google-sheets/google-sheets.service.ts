import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from 'src/shipment/entities/shipment.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentStatusUpdatedAction } from 'src/shipment/actions/shipment-status-updated.action';
import { RequestContextService } from 'src/request-context/request-context.service';
import * as cron from 'node-cron';

@Injectable()
export class GoogleSheetsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  private readonly CSV_URL = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}/export?format=csv&gid=0`;

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContext: RequestContextService,
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

      const escapedPro = proNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Find the existing shipment
      const existing = await this.shipmentModel.findOne({
        $or: [
          { proNumber: { $regex: `^${escapedPro}$`, $options: 'i' } },
          { ftlWareHouseId: { $regex: `^${escapedPro}$`, $options: 'i' } },
        ],
      });

      if (!existing) {
        skipped++;
        this.logger.warn(`No shipment for: ${proNumber}`);
        continue;
      }

      const updateData: any = {};
      const historyEntries: any[] = [];

      // ETA → estimatedDeliveryDate
      if (row.eta) {
        const etaDate = new Date(row.eta);
        if (!isNaN(etaDate.getTime())) {
          updateData.estimatedDeliveryDate = etaDate;
        }
      }

      // Actual Delivered → deliveryDate + auto status Delivered
      if (row.actualDelivered && !existing.deliveryDate) {
        const deliveredDate = new Date(row.actualDelivered);
        if (!isNaN(deliveredDate.getTime())) {
          updateData.deliveryDate = deliveredDate;
          updateData.status = 'delivered';
          historyEntries.push({
            status: 'delivered',
            note: 'Shipment delivered - synced from spreadsheet',
            timestamp: new Date(),
            updatedBy: 'Google Sheets Sync',
          });
        }
      }

      // Pickup Date → auto status In Transit
      if (row.pickupDate && !existing.pickupDate) {
        const pickupDate = new Date(row.pickupDate);
        if (!isNaN(pickupDate.getTime())) {
          updateData.pickupDate = pickupDate;
          if (updateData.status !== 'delivered') {
            updateData.status = 'in-transit';
            historyEntries.push({
              status: 'in-transit',
              note: 'Pickup confirmed - synced from spreadsheet',
              timestamp: new Date(),
              updatedBy: 'Google Sheets Sync',
            });
          }
        }
      }

      // Notes → $push only when sheet note differs from the last note
      let notePushed = false;
      if (row.notes) {
        const existingNotes = Array.isArray(existing.notes) ? existing.notes : [];
        const lastNoteText =
          existingNotes.length > 0
            ? (existingNotes[existingNotes.length - 1] as any).text || ''
            : '';

        if (row.notes.trim() !== String(lastNoteText).trim()) {
          await this.shipmentModel.updateOne(
            { _id: existing._id },
            {
              $push: {
                notes: {
                  text: row.notes.trim(),
                  internal: false,
                  createdAt: new Date(),
                  createdBy: 'Spreadsheet Sync',
                },
              },
            },
          );
          notePushed = true;
          this.logger.log(`Note added for ${proNumber}: ${row.notes}`);
        }
      }

      if (historyEntries.length > 0) {
        updateData.status_history = [...(existing.status_history || []), ...historyEntries];
      }

      delete updateData.notes;

      if (Object.keys(updateData).length === 0 && !notePushed) {
        skipped++;
        continue;
      }

      if (Object.keys(updateData).length > 0) {
        await this.shipmentModel.updateOne({ _id: existing._id }, { $set: updateData });

        // Fire status email if status changed
        if (updateData.status && updateData.status !== existing.status) {
          const updatedShipment = await this.shipmentModel
            .findById(existing._id)
            .populate('quote')
            .populate('customer_id', 'first_name last_name email')
            .exec();

          if (updatedShipment) {
            const systemUser = await this.requestContext.getSystemUser();
            await this.eventEmitter.emitAsync(
              'action',
              new ShipmentStatusUpdatedAction(systemUser, updatedShipment, {
                oldStatus: existing.status,
              }),
            );
          }
        }
      }

      updated++;
      this.logger.log(`Synced shipment ${proNumber}: ${JSON.stringify(updateData)}`);
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
    const pickupDateCol = headers.findIndex(
      (h) =>
        h.trim().toLowerCase().includes('actual pu dat') ||
        h.trim().toLowerCase().includes('pickup date'),
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
      pickupDate: string;
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
        pickupDate: pickupDateCol !== -1 ? cols[pickupDateCol]?.trim() : '',
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
