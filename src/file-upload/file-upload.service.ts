import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';

@Injectable()
export class FileUploadService {
  private imagekit: ImageKit;

  constructor(private configService: ConfigService) {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error(
        'ImageKit configuration is missing. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.',
      );
    }

    this.imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadFileResponseDto> {
    try {
      // Validate file type - allow images and documents, but not videos
      const allowedMimeTypes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf',
        'application/json',
        'application/xml',
        'text/xml',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Only images and documents are permitted.`,
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          `File size ${file.size} bytes exceeds the maximum allowed size of ${maxSize} bytes (10MB).`,
        );
      }

      // Upload to ImageKit
      const result = await this.imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: '/uploads',
        useUniqueFileName: true,
      });

      return {
        url: result.url,
        fileId: result.fileId,
        name: result.name,
        size: result.size,
        fileType: file.mimetype,
        folder: result.filePath,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to upload file: ${error.message || 'Unknown error'}`);
    }
  }
}
