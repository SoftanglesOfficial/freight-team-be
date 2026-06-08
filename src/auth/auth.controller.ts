import {
  Body,
  Controller,
  Get as NestGet,
  Req,
  UnauthorizedException,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Role } from '../roles/roles.decorator';
import { User } from 'src/user/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { Get, Patch, Post } from '../common/decorators/http.decorator';
import { AuthDto } from './dto/auth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Message } from 'src/common/dtos/message.dto';
import { UserSecretService } from 'src/user-secret/user-secret.service';
import { AuthService, OAuthProfile } from './auth.service';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly userSecretService: UserSecretService,
  ) {}

  @Public()
  @Post('signup', { response: AuthDto, status: HttpStatus.CREATED })
  async signup(@Body() dto: SignupDto): Promise<AuthDto> {
    const user = await this.userService.createUser(
      {
        ...dto,
        provider: 'local',
        roles: [Role.STANDARD_USER],
      },
      { dispatchAction: true },
    );
    return this.authService.signUser(user);
  }

  @Public()
  @Post('login', { response: AuthDto, status: HttpStatus.OK })
  async login(@Body() dto: SigninDto) {
    const user = await this.userService.authenticate(dto);
    return this.authService.signUser(user);
  }

  @Get('profile', { response: User, status: HttpStatus.OK })
  getProfile(@Req() req: Request) {
    return this.userService.getProfile(req.user.sub);
  }

  @Patch('profile', { response: AuthDto, status: HttpStatus.OK })
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const user = await this.userService.update(req.user.sub, dto);
    return this.authService.signUser(user);
  }

  @Patch('update-password', { response: Message, status: HttpStatus.OK })
  async updatePassword(@Body() dto: UpdatePasswordDto, @Req() req: Request) {
    const user = await this.userService.getProfile(req.user.sub);
    if (!this.userService.verifyPassword(user, dto.old_password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.userService.makeUserPassword(req.user.email, { password: dto.new_password });
    return new Message('Password updated successfully');
  }

  @Patch('preference', { response: User, status: HttpStatus.OK })
  updatePreference(@Body() dto: UpdatePreferenceDto, @Req() req: Request) {
    return this.userService.update(req.user.sub, { preference: dto });
  }

  @Public()
  @Post('reset-password', { response: Message, status: HttpStatus.OK })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.userSecretService.consume({
      email: dto.email,
      intent: 'reset-password',
      secret: dto.secret,
    });
    await this.userService.makeUserPassword(dto.email, { password: dto.password });
    return new Message('Password reset successfully');
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @NestGet('google')
  async googleAuth() {
    return { provider: 'google', redirect: true };
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @NestGet('google/redirect')
  async googleAuthRedirect(@Req() req: Request) {
    return this.authService.handleSocialLogin('google', req.user as OAuthProfile | undefined);
  }

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @NestGet('facebook')
  async facebookAuth() {
    return { provider: 'facebook', redirect: true };
  }

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @NestGet('facebook/redirect')
  async facebookAuthRedirect(@Req() req: Request) {
    return this.authService.handleSocialLogin('facebook', req.user as OAuthProfile | undefined);
  }

  @Public()
  @Post('seed-admin-user', { response: Message, status: HttpStatus.OK })
  async seedAdminUser() {
    await this.userService.seedAdminUsers([
      {
        first_name: 'ftlwarehouse',
        email: 'sales@ftlwarehouse.com',
        password: 'Password@123',
      },
    ]);
    return new Message('Admin user seeded successfully');
  }
}
