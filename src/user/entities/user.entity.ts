import { Entity } from 'src/common/base.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from 'src/roles/roles.decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class UserPreference {
  constructor() {
    this.email_notifications = true;
  }

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Boolean)
  @Prop({ type: Boolean, required: true, default: true })
  email_notifications: boolean;
}

@Schema({
  timestamps: true,
  toObject: {
    transform: (_doc, ret: any) => {
      delete ret.password;
      return ret;
    },
  },
})
export class User extends Entity implements IUser {
  @ApiProperty()
  @Prop({ type: String, required: true, trim: true })
  first_name: string;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false, trim: true })
  last_name?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email: string;

  @ApiProperty()
  @Prop({ type: String, required: false, trim: true, default: '' })
  password: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local',
  })
  provider: string;

  @ApiProperty()
  @Prop({
    type: [String],
    required: true,
    enum: Role,
    default: [Role.STANDARD_USER],
  })
  roles: Role[];

  @ApiProperty({ type: UserPreference })
  @Prop({
    type: UserPreference,
    required: true,
    default: new UserPreference(),
    _id: false,
  })
  preference: UserPreference;

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  is_online: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  is_available: boolean;
  
  @ApiProperty({ required: false })
  @Prop({ type: String, required: false, trim: true })
  phone?: string;

  @ApiProperty({ required: false })
  @Prop({ type: String, required: false, trim: true })
  company_name?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
export class UserPreview extends PickType(User, ['_id', 'first_name', 'last_name', 'email']) {}
export interface IUser {
  _id: Types.ObjectId;
  first_name: string;
}
