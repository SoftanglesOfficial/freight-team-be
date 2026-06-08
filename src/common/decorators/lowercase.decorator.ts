import { Transform } from 'class-transformer';

/**
 * Decorator that converts the decorated property value to lowercase
 * @returns PropertyDecorator
 */
export function Lowercase(): PropertyDecorator {
  return Transform(({ value }: { value: string }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return value;
  });
}
