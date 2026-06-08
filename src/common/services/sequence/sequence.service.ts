import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Entity, ICode } from '../../base.entity';

@Injectable()
export class SequenceService {
  async getCode<T extends Entity>(
    model: Model<T>,
    prefix: string,
    field: string = 'tracking_id',
  ): Promise<string> {
    const sequence = await model
      .find({ [field]: { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(1);
    let number = 0;
    if (sequence.length > 0) {
      const val = sequence[0][field];
      if (val && typeof val === 'string' && val.includes('-')) {
        number = parseInt(val.split('-')[1]);
      }
    }
    number++;
    return `${prefix}-${number.toString().padStart(4, '0')}`;
  }
}
