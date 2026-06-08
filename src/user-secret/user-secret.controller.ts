import { Controller, Body, Delete, Get, HttpStatus, Param, Patch, Req } from '@nestjs/common';
import { UserSecretService } from './user-secret.service';
import { CreateUserSecretDto } from './dto/create-user-secret.dto';
import { Post } from 'src/common/decorators/http.decorator';
import { ValidateUserSecretDto } from './dto/validate-user-secret.dto';
import { Message } from 'src/common/dtos/message.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Public()
@Controller('user-secret')
export class UserSecretController {
  constructor(
    private readonly userSecretService: UserSecretService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('/', { response: Message, status: HttpStatus.CREATED })
  async create(@Body() createUserSecretDto: CreateUserSecretDto, @Req() req: Express.Request) {
    const secret = await this.userSecretService.create(createUserSecretDto);
    return new Message('Secret created : ' + secret);
  }

  @Post('/validate', { response: Message, status: HttpStatus.OK })
  async validate(@Body() validateUserSecretDto: ValidateUserSecretDto) {
    await this.userSecretService.validate(validateUserSecretDto);
    return new Message('Secret validated');
  }
}
