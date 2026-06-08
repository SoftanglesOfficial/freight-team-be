import { PaginationDto } from './pagination.dto';

export interface IPaginated<T> {
  records: T[];
  pagination: PaginationDto;
}
