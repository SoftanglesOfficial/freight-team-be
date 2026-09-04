import { Controller, Body, Param } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { Roles, Role } from 'src/roles/roles.decorator';
import { Get, Post, Patch } from 'src/common/decorators/http.decorator';

@Controller('email-template')
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Roles(Role.SUPER_ADMIN)
  @Get('/', { response: Object, status: HttpStatus.OK, isArray: true })
  async findAll() {
    return this.emailTemplateService.listAll();
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('/:key', { response: Object, status: HttpStatus.OK })
  async findOne(@Param('key') key: string) {
    return this.emailTemplateService.getOne(key);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('/:key', { response: Object, status: HttpStatus.OK })
  async update(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.update(key, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/:key/reset', { response: Object, status: HttpStatus.OK })
  async reset(@Param('key') key: string) {
    return this.emailTemplateService.resetToDefault(key);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('/:key/preview', { response: Object, status: HttpStatus.OK })
  async preview(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.preview(key, dto.subject, dto.blocks);
  }
}
