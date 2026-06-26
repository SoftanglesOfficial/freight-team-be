import { Controller, Body, Patch, Param, Delete, Query, HttpStatus, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { BolParserService } from './bol-parser.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { PaginatedDocumentsDto } from './dto/paginated-documents.dto';
import { ParseBolResponseDto } from './dto/parse-bol-response.dto';
import { Document } from './entities/document.entity';
import { Roles, Role } from 'src/roles/roles.decorator';
import { Get, Post } from 'src/common/decorators/http.decorator';
import { BaseController } from 'src/common/base.controller';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Document')
@Controller('document')
export class DocumentController extends BaseController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly bolParserService: BolParserService,
  ) {
    super();
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/', {
    response: Document,
    status: HttpStatus.CREATED,
    description: 'Create a new document (Super Admin only)',
  })
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: Request,
  ): Promise<Document> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.documentService.create(createDocumentDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/parse-bol', {
    response: ParseBolResponseDto,
    status: HttpStatus.OK,
    description: 'Parse a BOL PDF and extract shipment fields (Super Admin only)',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'BOL PDF file to parse',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Bill of Lading PDF (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  async parseBol(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<ParseBolResponseDto> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.bolParserService.parseBolPdf(file);
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/', {
    response: PaginatedDocumentsDto,
    status: HttpStatus.OK,
    description: 'Get all documents with pagination and filtering',
  })
  async findAll(
    @Query() query: DocumentQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedDocumentsDto> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    // We let the service handle data isolation based on roles

    const result = await this.documentService.findAll(query);
    return new PaginatedDocumentsDto(result, query);
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/:id', {
    response: Document,
    status: HttpStatus.OK,
    description: 'Get a document by ID',
  })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Document> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    const document = await this.documentService.findOne(id);

    if (isStandardUser && !isSuperAdmin) {
      const user = req.user;
      const isOwnerById = document.customer?.toString() === user.sub;
      // Also allow if the user has access to the shipment
      let isShipmentOwner = false;
      if (document.shipment_id) {
        try {
          const shipment = await (this.documentService as any).shipmentModel.findById(document.shipment_id);
          isShipmentOwner = shipment?.customer_id?.toString() === user.sub || 
                            shipment?.customer?.email?.toLowerCase() === user.email?.toLowerCase();
        } catch (e) {
          // ignore
        }
      }
      
      if (!isOwnerById && !isShipmentOwner) {
        await this.authorize(false);
      }
    }

    return document;
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/:id/send-bol', { response: Object, status: HttpStatus.OK })
  async sendBolEmail(@Param('id') id: string, @Req() req: Request): Promise<{ message: string }> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.documentService.sendBolEmail(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('/:id')
  @ApiResponse({
    status: HttpStatus.OK,
    type: Document,
    description: 'Update a document (Super Admin only)',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: Request,
  ): Promise<Document> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.documentService.update(id, updateDocumentDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete('/:id')
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Delete a document (Super Admin only)',
  })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    await this.authorize(req.user.roles.includes(Role.SUPER_ADMIN));
    return this.documentService.remove(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/shipment/:shipmentId', {
    response: [Document],
    status: HttpStatus.OK,
    description: 'Get all documents for a shipment',
  })
  async findByShipmentId(
    @Param('shipmentId') shipmentId: string,
    @Req() req: Request,
  ): Promise<Document[]> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    const documents = await this.documentService.findByShipmentId(shipmentId);

    if (isStandardUser && !isSuperAdmin) {
      // Filter the underlying documents to only show those belonging to user
      return documents.filter(doc => doc.customer?.toString() === req.user.sub);
    }

    return documents;
  }

  @Roles(Role.SUPER_ADMIN, Role.STANDARD_USER)
  @Get('/quote-request/:quoteRequestId', {
    response: [Document],
    status: HttpStatus.OK,
    description: 'Get all documents for a quote request',
  })
  async findByQuoteRequestId(
    @Param('quoteRequestId') quoteRequestId: string,
    @Req() req: Request,
  ): Promise<Document[]> {
    const isSuperAdmin = req.user.roles.includes(Role.SUPER_ADMIN);
    const isStandardUser = req.user.roles.includes(Role.STANDARD_USER);

    await this.authorize(isSuperAdmin || isStandardUser);

    const documents = await this.documentService.findByQuoteRequestId(quoteRequestId);

    if (isStandardUser && !isSuperAdmin) {
      return documents.filter(doc => doc.customer?.toString() === req.user.sub);
    }

    return documents;
  }
}
