import { ArgumentMetadata, Injectable, PipeTransform, ValidationPipe } from '@nestjs/common';

@Injectable()
export class DefaultValidationPipe implements PipeTransform {
  private validationPipe: ValidationPipe;

  constructor() {
    this.validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
    });
  }

  transform(value: any, metadata: ArgumentMetadata) {
    return this.validationPipe.transform(value, metadata);
  }
}
