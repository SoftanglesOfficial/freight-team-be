import * as bcrypt from 'bcryptjs';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/roles.decorator';
import { UserQueryDto } from './dto/user-query.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UserCreatedAction } from './actions/user-created.action';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { RequestUser } from 'src/auth/strategies/jwt.strategy';
import { RequestContextService } from 'src/request-context/request-context.service';

@Injectable()
export class UserService {
  async seedAdminUsers(
    users: {
      first_name: string;
      email: string;
      password: string;
    }[],
  ): Promise<User[]> {
    const existingAdminUsers = await this.userModel.find({
      roles: { $in: [Role.SUPER_ADMIN] },
    });
    if (existingAdminUsers.length > 0) {
      return existingAdminUsers;
    }
    const adminUsers = await this.userModel.insertMany(
      users.map((user) => ({
        ...user,
        password: this.hashPassword(user.password),
        roles: [Role.SUPER_ADMIN],
      })),
    );
    return adminUsers;
  }

  public readonly model: Model<User>;
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.model = userModel;
  }

  async checkEmailAvailability(email: string, except?: string[]): Promise<boolean> {
    const filter: FilterQuery<User> = { email };
    if (except && except.length > 0) {
      filter._id = { $nin: except };
    }
    const existing = await this.userModel.findOne(filter).exec();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    return true;
  }

  private generateRandomPassword(length = 12): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    // ensure at least one of each type
    let password =
      upper[Math.floor(Math.random() * upper.length)] +
      lower[Math.floor(Math.random() * lower.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      special[Math.floor(Math.random() * special.length)];
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    // shuffle
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  async createCustomer(dto: CreateCustomerDto): Promise<User> {
    const plainPassword = this.generateRandomPassword();

    const user = await this.createUser(
      {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        password: plainPassword,
        provider: 'local',
        roles: [Role.STANDARD_USER],
        phone: dto.phone,
        company_name: dto.company_name,
      },
      { dispatchAction: true, plainPassword },
    );

    return user;
  }

  async createUser(
    dto: Pick<
      User,
      | 'first_name'
      | 'last_name'
      | 'email'
      | 'password'
      | 'provider'
      | 'roles'
      | 'phone'
      | 'company_name'
    >,
    options?: { dispatchAction?: boolean; plainPassword?: string },
  ): Promise<User> {
    await this.checkEmailAvailability(dto.email);

    const user = await this.userModel.create({
      ...dto,
      password: this.hashPassword(dto.password),
    });

    if (options?.dispatchAction) {
      const actor = await this.getOrCreateSystemUser();
      await this.eventEmitter.emitAsync(
        'action',
        new UserCreatedAction(actor, user as User, { plainPassword: options.plainPassword }),
      );
    }

    return user as User;
  }

  async authenticate(dto: Pick<User, 'email' | 'password'>): Promise<User> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user || !this.verifyPassword(user, dto.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user as User;
  }

  verifyPassword(user: User, plain: string) {
    if (!user.password) {
      return false;
    }

    return bcrypt.compareSync(plain, user.password);
  }

  async getProfile(id: string): Promise<User> {
    return await this.userModel
      .findById(id)
      .orFail(new UnauthorizedException('User not found'))
      .exec();
  }

  async findByEmailOrDefault(email: string): Promise<User | null> {
    return await this.model.findOne({ email });
  }

  async update(id: string, dto: Partial<Omit<User, 'password'>>): Promise<User> {
    if (dto.email) {
      await this.checkEmailAvailability(dto.email, [id]);
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true })
      .orFail(new NotFoundException('User not found'))
      .exec();
    return user;
  }

  // async updatePassword(email: string, newPassword: string): Promise<User> {
  //   const user = await this.userModel
  //     .findOneAndUpdate({ email }, { password: this.hashPassword(newPassword) }, { new: true })
  //     .orFail(new NotFoundException('User not found'))
  //     .exec();
  //   return user;
  // }

  hashPassword(password: string): string {
    return bcrypt.hashSync(password, bcrypt.genSaltSync());
  }

  async findAll(query: UserQueryDto): Promise<[User[], number]> {
    const { search, is_active, skip, pageSize } = query;
    const filter: FilterQuery<User> = {};
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (is_active !== undefined) {
      filter.is_active = is_active;
    }
    if (query.role) {
      filter.roles = { $in: [query.role] };
    }
    const records = await this.userModel.find(filter).skip(skip).limit(pageSize);
    const count = await this.userModel.countDocuments(filter);
    return [records, count];
  }

  async makeUserPassword(id: string, dto: Pick<User, 'password'>): Promise<User> {
    const hashedPassword = this.hashPassword(dto.password);
    return await this.userModel
      .findByIdAndUpdate(
        { _id: new Types.ObjectId(id) },
        { password: hashedPassword },
        {
          new: true,
        },
      )
      .orFail(new NotFoundException('User not found'));
  }

  async adminUserForContact() {
    return await this.userModel
      .findOne({
        roles: {
          $in: Role.SUPER_ADMIN,
        },
        is_available: true,
      })
      .select('first_name last_name is_online is_available')
      .orFail(
        new BadRequestException('Sorry, We are not available right now. Please try again later.'),
      );
  }

  // async authenticate(
  //   credentials: LoginDto,
  //   exception: HttpException = new UnauthorizedException('Invalid credentials'),
  // ) {
  //   const user = await this.userModel
  //     // .findOne({ $or: [{ email: credentials.email }, { username: credentials.username }] })
  //     .findOne({ email: credentials.email })
  //     .orFail(exception);

  //   if (!this.bcrypt.compareSync(credentials.password, user.password)) {
  //     throw exception;
  //   }
  //   return user;
  // }

  // signUser(user: User): AuthenticatedResponseDto {
  //   const payload: RequestUser = {
  //     id: user._id.toString(),
  //     name: user.name,
  //     email: user.email,
  //     role: user.role,
  //   };
  //   const accessToken = this.jwtService.sign(payload);
  //   return {
  //     accessToken,
  //     user,
  //   };
  // }

  async findByEmailOrFail(
    email: string,
    exception: HttpException = new NotFoundException('Account not found with this email'),
  ): Promise<User> {
    return await this.userModel.findOne({ email }).orFail(exception);
  }

  // async findOne(id: string) {
  //   return await this.userModel
  //     .findById(new Types.ObjectId(id))
  //     .orFail(new NotFoundException('User not found'));
  // }

  // async updateUserProfile(id: string, body: UpdateProfileDto): Promise<User> {
  //   return await this.userModel
  //     .findByIdAndUpdate(new Types.ObjectId(id), body, {
  //       new: true,
  //     })
  //     .orFail(new NotFoundException('User not found'));
  // }

  // async updateUsername(id: string, username: string): Promise<User> {
  //   const usernameExists = await this.userModel.exists({
  //     username,
  //     _id: { $ne: new Types.ObjectId(id) },
  //   });
  //   if (usernameExists) {
  //     throw new ConflictException('Username already in use');
  //   }
  //   return await this.userModel
  //     .findByIdAndUpdate(new Types.ObjectId(id), { username }, { new: true })
  //     .orFail(new NotFoundException('User not found'));
  // }

  // async updatePassword(email: string, password: string): Promise<User> {
  //   const hashedPassword = this.bcrypt.hashSync(
  //     password,
  //     this.bcrypt.genSaltSync(),
  //   );
  //   return await this.userModel
  //     .findOneAndUpdate(
  //       { email },
  //       { password: hashedPassword },
  //       {
  //         new: true,
  //       },
  //     )
  //     .orFail(new NotFoundException('User not found'));
  // }

  // async updateNotificationSettings(
  //   id: string,
  //   body: NotificationSettings,
  // ): Promise<NotificationSettings> {
  //   const user = await this.userModel
  //     .findByIdAndUpdate(
  //       new Types.ObjectId(id),
  //       { notificationSettings: body, isNotificationDefault: false },
  //       { new: true },
  //     )
  //     .orFail(new NotFoundException('User not found'));
  //   return user.notificationSettings;
  // }

  // async markEmailAsVerified(email: string): Promise<User> {
  //   return await this.userModel
  //     .findOneAndUpdate(
  //       { email },
  //       { emailVerifiedAt: new Date() },
  //       { new: true },
  //     )
  //     .orFail(new NotFoundException('User not found'));
  // }

  async findAdminUsers(): Promise<User[]> {
    return await this.userModel.find({ roles: { $in: [Role.SUPER_ADMIN] } });
  }

  async findAvailableAdminIds(): Promise<string[]> {
    const admins = await this.userModel
      .find({
        roles: { $in: [Role.SUPER_ADMIN] },
        is_available: true,
      })
      .select('_id');
    return admins.map((admin) => admin._id.toString());
  }

  async findAllAdminIds(): Promise<string[]> {
    const admins = await this.userModel
      .find({
        roles: { $in: [Role.SUPER_ADMIN] },
      })
      .select('_id');
    return admins.map((admin) => admin._id.toString());
  }

  async findAdminEmails(): Promise<string[]> {
    const admins = await this.userModel.find({
      roles: { $in: [Role.SUPER_ADMIN] },
    });
    return admins.map((admin) => admin.email);
  }

  async markUserStatus(id: string, status: 'user_online' | 'user_offline'): Promise<User> {
    return await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { is_online: status === 'user_online' },
        { new: true },
      )
      .orFail(new NotFoundException('User not found'));
  }

  // async update(
  //   { email }: { email: string },
  //   data: Partial<
  //     {
  //       userId: string;
  //     } & Pick<
  //       User,
  //       | 'userPerformance'
  //       | 'providerPerformance'
  //       | 'stripeCustomerId'
  //       | 'stripeAccountId'
  //     >
  //   >,
  // ) {
  //   return await this.userModel.findOneAndUpdate({ email: email }, data, {
  //     new: true,
  //   });
  // }

  // async seedAdminUsers() {
  //   const adminEmailsRaw: string =
  //     this.configService.get<string>('ADMIN_EMAILS') ?? '';
  //   const ADMIN_EMAILS: string[] = adminEmailsRaw
  //     .split(',')
  //     .map((email) => email.trim())
  //     .filter((email) => email.length > 0);

  //   if (ADMIN_EMAILS.length === 0) {
  //     throw new BadRequestException('No admin emails found.');
  //   }

  //   //find existing users with emails in
  //   const existingUsers = await this.userModel.find({
  //     email: { $in: ADMIN_EMAILS },
  //   });
  //   //find missing emails
  //   const missingEmails = ADMIN_EMAILS.filter(
  //     (email) => !existingUsers.some((user) => user.email === email),
  //   );
  //   //create missing users
  //   const missingUsers = missingEmails.map((email) => ({
  //     name: email.split('@')[0],
  //     email,
  //     password: this.bcrypt.hashSync('password', this.bcrypt.genSaltSync()),
  //     role: UserRole.SuperAdmin,
  //   }));
  //   await this.userModel.insertMany(missingUsers);
  // }

  async getOrCreateSystemUser(): Promise<User> {
    const email = 'system@example.com';
    let systemUser = await this.userModel.findOne({
      email,
      roles: { $in: [Role.SYSTEM] },
    });

    if (!systemUser) {
      systemUser = await this.userModel.create({
        first_name: 'System',
        email,
        password: this.hashPassword(Math.random().toString(36).slice(2)),
        roles: [Role.SYSTEM],
      });
    }
    return systemUser;
  }

  async remove(id: string): Promise<User> {
    return await this.userModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException('User not found'));
  }
}
