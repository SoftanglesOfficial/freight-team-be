import { Body, Controller, Delete, HttpStatus, Param, Query } from '@nestjs/common';
import { BaseController } from 'src/common/base.controller';
import { UserService } from './user.service';
import { Get, Patch, Post } from 'src/common/decorators/http.decorator';
import { PaginatedUsersDto } from './dto/paginated-users.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { User } from './entities/user.entity';
import { MakeUserPasswordDto } from './dto/make-password.dto';
import { Role, Roles } from 'src/roles/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('user')
@Roles(Role.SUPER_ADMIN)
export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get('/', { response: PaginatedUsersDto, status: HttpStatus.OK })
  async index(@Query() query: UserQueryDto): Promise<PaginatedUsersDto> {
    const result = await this.userService.findAll(query);
    return new PaginatedUsersDto(result, query);
  }

  @Post('/create-customer', { response: User, status: HttpStatus.CREATED })
  async createCustomer(@Body() dto: CreateCustomerDto): Promise<User> {
    return this.userService.createCustomer(dto);
  }

  @Get('/:id', { response: User, status: HttpStatus.OK })
  async findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<User> {
    return await this.userService.getProfile(id);
  }

  @Patch('/:id', { response: User, status: HttpStatus.OK })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch('/:id/make-password', { response: User, status: HttpStatus.OK })
  async makePassword(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateUserDto: MakeUserPasswordDto,
  ): Promise<User> {
    return this.userService.makeUserPassword(id, { password: updateUserDto.new_password });
  }

  @Delete('/:id')
  async remove(@Param('id', ParseObjectIdPipe) id: string): Promise<User> {
    return this.userService.remove(id);
  }
}
