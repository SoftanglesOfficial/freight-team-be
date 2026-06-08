import { Controller, UploadedFile, UseInterceptors, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileUploadService } from './file-upload.service';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';
import { Post } from '../common/decorators/http.decorator';
import { BaseController } from '../common/base.controller';

@Controller('file-upload')
export class FileUploadController extends BaseController {
  constructor(private readonly fileUploadService: FileUploadService) {
    super();
  }

  @Post('/upload', {
    response: UploadFileResponseDto,
    status: HttpStatus.CREATED,
    description: 'Upload an image or document file to ImageKit and get the file URL',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Image or document file (max 10MB). Supported formats: JPEG, PNG, GIF, WebP, SVG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, RTF, JSON, XML',
        },
      },
      required: ['file'],
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new Error('No file provided');
    }

    return this.fileUploadService.uploadFile(file);
  }
}
