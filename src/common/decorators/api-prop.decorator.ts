// import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
// import { applyDecorators } from '@nestjs/common';
// import 'reflect-metadata';

// export type PropertyOptions = Omit<ApiPropertyOptions, 'required' | 'enum' | 'enumName' | 'type'> & {
//   required?: boolean;
//   enum?: any;
//   enumName?: string;
//   type?: () => Function | [Function] | Function[];
//   isOptional?: boolean;
//   isNumber?: boolean;
//   isBoolean?: boolean;
//   isObject?: boolean;
//   isArray?: boolean;
// };

// /**
//  * Custom decorator that applies ApiProperty with automatic rules:
//  *
//  * Rules:
//  * 1. ApiProperty is always applied
//  * 2. Automatically detects if property is optional (?) and sets required: false
//  * 3. If property is enum, applies enum and enumName
//  * 4. If property is number, sets type: Number
//  * 5. If property is boolean, sets type: Boolean
//  * 6. If property is object, enables nested validation with type
//  *
//  * Usage examples:
//  *
//  * @ApiProp() // Required string (default)
//  * name: string;
//  *
//  * @ApiProp() // Automatically detects optional property
//  * email?: string;
//  *
//  * @ApiProp({ enum: MediaFileStatus, enumName: 'MediaFileStatus' })
//  * status: MediaFileStatus;
//  *
//  * @ApiProp({ isNumber: true })
//  * fileSize: number;
//  *
//  * @ApiProp({ isBoolean: true })
//  * isActive: boolean;
//  *
//  * @ApiProp({ isObject: true, type: () => UserPreferences })
//  * preferences: UserPreferences;
//  *
//  * @ApiProp({ isArray: true, type: () => String })
//  * tags: string[];
//  */
// export function ApiProp(options: PropertyOptions = {}) {
//   return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
//     const {
//       isOptional,
//       isNumber,
//       isBoolean,
//       isObject,
//       isArray,
//       enum: enumValue,
//       enumName,
//       type,
//       ...restOptions
//     } = options;

//     // Try to detect if property is optional
//     // Note: TypeScript doesn't expose optional property info at runtime,
//     // so we check multiple indicators:
//     // 1. Explicit isOptional flag
//     // 2. Explicit required: false
//     // 3. Property descriptor (if available)
//     const propertyType = Reflect.getMetadata('design:type', target, propertyKey);
//     const descriptorValue = descriptor?.value;
//     const hasExplicitOptional = isOptional === true || options.required === false;

//     // Check if property might be optional by checking if it's not in the prototype
//     // This is a heuristic - not 100% reliable but better than nothing
//     const mightBeOptional = !hasExplicitOptional &&
//       descriptorValue === undefined &&
//       !(propertyKey in target) &&
//       target[propertyKey] === undefined;

//     // Rule 2: If property is optional (?), sets required: false
//     // Prefer explicit flags, fall back to heuristics
//     const required = hasExplicitOptional || mightBeOptional ? false : options.required ?? true;

//   // Build ApiProperty options
//   const apiPropertyOptions: ApiPropertyOptions = {
//     required,
//     ...restOptions,
//   };

//   // Rule 3: If property is enum, applies enum and enumName
//   if (enumValue) {
//     apiPropertyOptions.enum = enumValue;
//     // enumName is not a standard ApiPropertyOptions property, but can be used in description
//     if (enumName) {
//       apiPropertyOptions.description = `${apiPropertyOptions.description || ''} Enum: ${enumName}`.trim();
//     }
//   }

//   // Rule 4: If property is number, sets type: Number
//   if (isNumber) {
//     apiPropertyOptions.type = Number;
//   }

//   // Rule 5: If property is boolean, sets type: Boolean
//   if (isBoolean) {
//     apiPropertyOptions.type = Boolean;
//   }

//   // Rule 6: If property is object, enables nested validation
//   if (isObject && type) {
//     apiPropertyOptions.type = type;
//   }

//   // Handle array type
//   if (isArray) {
//     if (type) {
//       apiPropertyOptions.type = type;
//       apiPropertyOptions.isArray = true;
//     } else {
//       apiPropertyOptions.isArray = true;
//     }
//   }

//   // If type is explicitly provided without flags, use it
//   if (type && !isObject && !isArray && !isNumber && !isBoolean) {
//     apiPropertyOptions.type = type;
//   }

//     // Rule 1: ApiProperty is always applied
//     return applyDecorators(ApiProperty(apiPropertyOptions));
//   };
// }
