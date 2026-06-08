// import { ApiProperty } from '@nestjs/swagger';

// export class DocumentResponseDto {
//   @ApiProperty({
//     description: 'The document ID',
//     type: String,
//     example: '507f1f77bcf86cd799439011',
//   })
//   _id: string;

//   @ApiProperty({
//     description: 'The name of the document',
//     example: 'Invoice-001.pdf',
//   })
//   name: string;

//   @ApiProperty({
//     description: 'The size of the document in bytes',
//     example: 1024000,
//   })
//   size: number;

//   @ApiProperty({
//     description: 'The MIME type of the document',
//     example: 'application/pdf',
//   })
//   type: string;

//   @ApiProperty({
//     description: 'The internal ID in format sh-0000000',
//     example: 'sh-0000123',
//   })
//   internal_id: string;

//   @ApiProperty({
//     description: 'The URL where the document is stored',
//     example: 'https://ik.imagekit.io/gbeubjjsq/uploads/document_123.pdf',
//   })
//   url: string;

//   @ApiProperty({
//     description: 'The file ID from the storage service',
//     example: 'file_123',
//     required: false,
//   })
//   file_id?: string;

//   @ApiProperty({
//     description: 'ID of the associated shipment',
//     type: String,
//     required: false,
//   })
//   shipment_id?: string;

//   @ApiProperty({
//     description: 'ID of the associated quote request',
//     type: String,
//     required: false,
//   })
//   quote_request_id?: string;

//   @ApiProperty({
//     description: 'The creation timestamp',
//     example: '2024-12-30T12:00:00.000Z',
//   })
//   createdAt: Date;

//   @ApiProperty({
//     description: 'The last update timestamp',
//     example: '2024-12-30T12:00:00.000Z',
//   })
//   updatedAt: Date;
// }
