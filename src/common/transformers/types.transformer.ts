import { BadRequestException } from '@nestjs/common';
import { TransformFnParams } from 'class-transformer';

export const ToBoolean = ({ value }: TransformFnParams): boolean => {
  return value === 'true' || value === true || value === 1 || value === '1' ? true : false;
};

export const ToNumber = ({ value }: TransformFnParams): number => {
  return Number(value);
};

export const DollarToCents = ({ value }: TransformFnParams): number => {
  const numberVal = Number(value);
  if (Number.isNaN(numberVal)) {
    throw new BadRequestException('Value must be a number');
  }
  return numberVal * 100;
};
