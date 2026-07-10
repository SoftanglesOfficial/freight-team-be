import { Injectable } from '@nestjs/common';

@Injectable()
export class SequenceService {
  async getCode(model: any, prefix: string, field: string = 'tracking_id'): Promise<string> {
    const sequence = await model
      .find({
        [field]: { $exists: true, $regex: `^${prefix}-` },
      })
      .sort({ createdAt: -1 })
      .limit(1);

    let number = 0;
    if (sequence.length > 0) {
      const val = sequence[0][field];
      if (val && typeof val === 'string' && val.includes('-')) {
        const parts = val.split('-');
        const parsed = parseInt(parts[parts.length - 1]);
        if (!isNaN(parsed)) number = parsed;
      }
    }

    number++;
    return `${prefix}-${number.toString().padStart(4, '0')}`;
  }
}
