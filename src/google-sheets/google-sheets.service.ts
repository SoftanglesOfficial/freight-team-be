import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from 'src/shipment/entities/shipment.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentStatusUpdatedAction } from 'src/shipment/actions/shipment-status-updated.action';
import { RequestContextService } from 'src/request-context/request-context.service';
import * as cron from 'node-cron';

export interface GoogleSheetRow {
  proNumber: string;
  ftlWareHouseId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  status?: string;
  pickupDate?: string;
  eta?: string;
  actualDelivered?: string;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
}

const STATUS_ALIASES: Record<string, 'pending' | 'in-transit' | 'delivered'> = {
  pending: 'pending',
  'not started': 'pending',
  created: 'pending',
  scheduled: 'pending',
  'in transit': 'in-transit',
  'in-transit': 'in-transit',
  shipped: 'in-transit',
  'picked up': 'in-transit',
  'en route': 'in-transit',
  dispatched: 'in-transit',
  delivered: 'delivered',
  complete: 'delivered',
  completed: 'delivered',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
      this.logger.warn('GOOGLE_SHEETS_SPREADSHEET_ID not set — Google Sheets sync disabled');
      return;
    }

    // Run immediately on startup
    this.syncFromCsv();

    // Schedule every 15 minutes — belt-and-suspenders behind the Apps Script
    // webhook, in case an edit fires while Apps Script is unreachable.
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

  async syncFromWebhook(rows: GoogleSheetRow[]): Promise<{ updated: number; skipped: number }> {
    return this.processRows(rows);
  }

  private async processRows(rows: GoogleSheetRow[]): Promise<{ updated: number; skipped: number }> {
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const proNumber = row.proNumber?.toString().trim();
      if (!proNumber) {
        skipped++;
        continue;
      }

      const ftlWareHouseId = row.ftlWareHouseId?.toString().trim();
      const orderNumber = row.orderNumber?.toString().trim();
      const invoiceNumber = row.invoiceNumber?.toString().trim();

      // Match the sheet row to a shipment by whichever identifier(s) it carries —
      // PRO # is the primary key, but Order #, FTL Warehouse ID, and Invoice #
      // are all accepted so staff can key off whatever the Sheet already uses.
      const matchConditions: Record<string, unknown>[] = [
        { proNumber: { $regex: `^${escapeRegex(proNumber)}$`, $options: 'i' } },
        { ftlWareHouseId: { $regex: `^${escapeRegex(proNumber)}$`, $options: 'i' } },
      ];
      if (ftlWareHouseId) {
        matchConditions.push({
          ftlWareHouseId: { $regex: `^${escapeRegex(ftlWareHouseId)}$`, $options: 'i' },
        });
      }
      if (orderNumber) {
        matchConditions.push(
          { poNumber: { $regex: `^${escapeRegex(orderNumber)}$`, $options: 'i' } },
          { ftlWareHouseId: { $regex: `^${escapeRegex(orderNumber)}$`, $options: 'i' } },
        );
      }
      if (invoiceNumber) {
        matchConditions.push({
          invoiceNumber: { $regex: `^${escapeRegex(invoiceNumber)}$`, $options: 'i' },
        });
      }

      const existing = await this.shipmentModel.findOne({ $or: matchConditions });

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

      // Order # / Invoice # — fill in gaps only. Never overwrite a value staff
      // already entered manually on the site (same rule as PRO # / FTL ID).
      if (orderNumber && !existing.poNumber) {
        updateData.poNumber = orderNumber;
      }
      if (invoiceNumber && !existing.invoiceNumber) {
        updateData.invoiceNumber = invoiceNumber;
      }

      // Pickup Date — fill in gaps only, same reasoning.
      if (row.pickupDate && !existing.pickupDate) {
        const pickup = new Date(row.pickupDate);
        if (!isNaN(pickup.getTime())) {
          updateData.pickupDate = pickup;
        }
      }

      // Customer / account info — fill in gaps only, same reasoning.
      const customerName = row.customerName?.toString().trim();
      const customerEmail = row.customerEmail?.toString().trim();
      const customerPhone = row.customerPhone?.toString().trim();
      const companyName = row.companyName?.toString().trim();
      if (customerName && !existing.customer?.name) {
        updateData['customer.name'] = customerName;
      }
      if (customerEmail && !existing.customer?.email) {
        updateData['customer.email'] = customerEmail;
      }
      if (customerPhone && !existing.customer?.phone) {
        updateData['customer.phone'] = customerPhone;
      }
      if (companyName && !existing.customer?.company_name) {
        updateData['customer.company_name'] = companyName;
      }

      // Status sync. Priority (highest wins), same as manual edits on the site:
      //   1. Actual Delivered filled in       → delivered
      //   2. Explicit Status column            → whatever it says
      //   3. Pickup Date filled in for the first time → in-transit
      let nextStatus: 'pending' | 'in-transit' | 'delivered' | undefined;
      let statusNote: string | undefined;

      if (updateData.pickupDate && existing.status !== 'delivered') {
        nextStatus = 'in-transit';
        statusNote = 'Pickup confirmed - In Transit (synced from spreadsheet)';
      }

      const rawStatus = row.status?.toString().trim().toLowerCase();
      if (rawStatus) {
        const mapped = STATUS_ALIASES[rawStatus];
        if (mapped) {
          nextStatus = mapped;
          statusNote = `Status synced from spreadsheet: ${mapped}`;
        } else {
          this.logger.warn(`Unrecognized status "${row.status}" for ${proNumber} — ignoring`);
        }
      }

      if (row.actualDelivered && !existing.deliveryDate) {
        const deliveredDate = new Date(row.actualDelivered);
        if (!isNaN(deliveredDate.getTime())) {
          updateData.deliveryDate = deliveredDate;
          nextStatus = 'delivered';
          statusNote = 'Shipment delivered - synced from spreadsheet';
        }
      }

      if (nextStatus && nextStatus !== existing.status) {
        updateData.status = nextStatus;
        historyEntries.push({
          status: nextStatus,
          note: statusNote,
          timestamp: new Date(),
          updatedBy: 'Google Sheets Sync',
        });
      }

      // Notes → $push only when the sheet note differs from the last note
      let notePushed = false;
      if (row.notes) {
        const rawNotes = (existing as any).notes;
        const existingNotes = Array.isArray(rawNotes) ? rawNotes : [];
        const lastNoteText = Array.isArray(rawNotes)
          ? existingNotes.length > 0
            ? (existingNotes[existingNotes.length - 1] as any).text || ''
            : ''
          : typeof rawNotes === 'string'
            ? rawNotes
            : '';

        if (row.notes.trim() !== String(lastNoteText).trim()) {
          // Migrate notes from string to array if needed
          if (typeof rawNotes === 'string' || !Array.isArray(rawNotes)) {
            const migratedNote = rawNotes
              ? [{ text: rawNotes, internal: false, createdAt: new Date(), createdBy: 'Migration' }]
              : [];
            await this.shipmentModel.updateOne(
              { _id: existing._id },
              { $set: { notes: migratedNote } },
            );
          }

          // Now safely push the new note (raw driver bypasses Mongoose schema validation)
          await this.shipmentModel.collection.updateOne(
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
            } as any,
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

  private parseCsv(csv: string): GoogleSheetRow[] {
    const lines = csv.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const norm = (h: string) => h.trim().toUpperCase();

    const findCol = (...names: string[]) =>
      headers.findIndex((h) => names.includes(norm(h)));

    const proCol = findCol('PRO');
    const ftlCol = findCol('FTL', 'FTL WAREHOUSE ID', 'FTL #', 'FTL NUMBER');
    const orderCol = findCol('ORDER #', 'ORDER NUMBER', 'ORDER', 'PO', 'PO NUMBER', 'PO #');
    const invoiceCol = findCol('INVOICE #', 'INVOICE NUMBER', 'INVOICE', 'INV#', 'INV #');
    const statusCol = findCol('STATUS');
    const pickupDateCol = findCol(
      'PICKUP DATE',
      'PICKUP',
      'ACTUAL PU DATE',
      'ACTUAL PICKUP DATE',
    );
    const etaCol = findCol('ETA');
    const actualDeliveredCol = headers.findIndex((h) =>
      h.trim().toLowerCase().includes('actual delivered'),
    );
    const notesCol = findCol('NOTES');
    const customerNameCol = findCol(
      'CUSTOMER',
      'CUSTOMER NAME',
      'CUSTOMER - BILL TO',
      'BILL TO',
    );
    const customerEmailCol = findCol('CUSTOMER EMAIL', 'EMAIL');
    const customerPhoneCol = findCol('CUSTOMER PHONE', 'PHONE', 'PH #', 'PH#');
    const companyCol = findCol('COMPANY', 'COMPANY NAME');

    if (proCol === -1) {
      this.logger.error('PRO column not found in CSV headers');
      return [];
    }

    const get = (cols: string[], col: number) => (col !== -1 ? cols[col]?.trim() : undefined);

    const rows: GoogleSheetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const proNumber = cols[proCol]?.trim();
      if (!proNumber) continue;

      rows.push({
        proNumber,
        ftlWareHouseId: get(cols, ftlCol),
        orderNumber: get(cols, orderCol),
        invoiceNumber: get(cols, invoiceCol),
        status: get(cols, statusCol),
        pickupDate: get(cols, pickupDateCol),
        eta: get(cols, etaCol),
        actualDelivered: get(cols, actualDeliveredCol),
        notes: get(cols, notesCol),
        customerName: get(cols, customerNameCol),
        customerEmail: get(cols, customerEmailCol),
        customerPhone: get(cols, customerPhoneCol),
        companyName: get(cols, companyCol),
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
