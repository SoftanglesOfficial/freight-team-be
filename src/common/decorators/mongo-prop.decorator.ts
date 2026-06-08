// import { Prop as MongooseProp, PropOptions } from '@nestjs/mongoose';
// import { applyDecorators } from '@nestjs/common';
// import { Types } from 'mongoose';
// import { ApiProp, PropertyOptions } from './api-prop.decorator';
// import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

// type CombinedPropOptions = PropOptions & Omit<PropertyOptions, 'type'> & {
//   swaggerType?: () => Function | [Function] | Function[];
// };

// /**
//  * Combined decorator that applies both @Prop() and @Property() together
//  * This ensures that when you use @Prop(), the ApiProperty is automatically applied
//  *
//  * Usage:
//  * @PropDecorator({ type: String, required: true })
//  * name: string;
//  *
//  * @PropDecorator({ type: String, required: false, isOptional: true })
//  * email?: string;
//  *
//  * @PropDecorator({ type: String, enum: MediaFileStatus, enumName: 'MediaFileStatus' })
//  * status: MediaFileStatus;
//  *
//  * @PropDecorator({ type: Number, required: true, isNumber: true })
//  * fileSize: number;
//  *
//  * @PropDecorator({ type: Boolean, required: true, isBoolean: true })
//  * isActive: boolean;
//  */
// export function Prop(options: CombinedPropOptions = {}) {
//   const {
//     isOptional,
//     isNumber,
//     isBoolean,
//     isObject,
//     isArray,
//     enum: enumValue,
//     enumName,
//     swaggerType,
//     ...propOptions
//   } = options;

//   // Extract Property options
//   const propertyOptions: PropertyOptions = {};
//   if (isOptional !== undefined) propertyOptions.isOptional = isOptional;
//   if (isNumber !== undefined) propertyOptions.isNumber = isNumber;
//   if (isBoolean !== undefined) propertyOptions.isBoolean = isBoolean;
//   if (isObject !== undefined) propertyOptions.isObject = isObject;
//   if (isArray !== undefined) propertyOptions.isArray = isArray;
//   if (enumValue) propertyOptions.enum = enumValue;
//   if (enumName) propertyOptions.enumName = enumName;

//   // If type is Types.ObjectId, automatically set Swagger type to String
//   const mongooseType = (options as any).type;
//   if (swaggerType) {
//     propertyOptions.type = swaggerType;
//     propertyOptions.isArray = Array.isArray(swaggerType);
//   }
//   else if (mongooseType === Types.ObjectId || mongooseType === 'ObjectId' || (Array.isArray(mongooseType) && mongooseType[0] === Types.ObjectId)) {
//     propertyOptions.type = () => String;
//   }

//   // Determine if property is optional based on required flag
//   if (propOptions.required === false && propertyOptions.isOptional === undefined) {
//     propertyOptions.isOptional = true;
//   }

//   return applyDecorators(
//     ApiProp({type: swaggerType}),
//     MongooseProp(propOptions as PropOptions),
//   );
// }
