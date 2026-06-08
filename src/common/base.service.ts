import { HttpException } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';

export abstract class BaseService<T> {
  constructor(public readonly model: Model<any>) {}

  async findOneOrDefault(
    filter: FilterQuery<T>,
    fail?: { notfound?: HttpException; exists?: HttpException },
  ): Promise<T | null> {
    const item = await this.model.findOne(filter);
    if (fail?.notfound && !item) {
      throw fail.notfound;
    }
    if (fail?.exists && item) {
      throw fail.exists;
    }
    return item;
  }

  async findOrDefault(filter: FilterQuery<T>): Promise<T[]> {
    return await this.model.find(filter);
  }
}
