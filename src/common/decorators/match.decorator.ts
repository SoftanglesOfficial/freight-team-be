import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function matchValidator(value: any, args: ValidationArguments): boolean {
  const [relatedPropertyName] = args.constraints as string[];
  const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
  return value === relatedValue;
}

export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate: matchValidator,
      },
    });
  };
}
