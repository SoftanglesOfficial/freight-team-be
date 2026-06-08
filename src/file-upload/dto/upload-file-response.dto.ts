import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'The URL of the uploaded file',
    example: 'https://ik.imagekit.io/gbeubjjsq/uploads/file_123.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'The file ID assigned by ImageKit',
    example: 'file_123',
  })
  fileId: string;

  @ApiProperty({
    description: 'The name of the uploaded file',
    example: 'document.pdf',
  })
  name: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'The file type/MIME type',
    example: 'image/jpeg',
  })
  fileType: string;

  @ApiProperty({
    description: 'The file path where the file was uploaded (including folder)',
    example: '/uploads/file_123.jpg',
  })
  folder: string;

  @ApiProperty({
    description: 'The upload timestamp',
    example: '2024-12-30T12:00:00.000Z',
  })
  uploadedAt: string;
}
