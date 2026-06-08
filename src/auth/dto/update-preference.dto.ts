import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { IsBoolean, IsMongoId } from 'class-validator';
import { IsOptional } from 'class-validator';
import { UserPreference } from 'src/user/entities/user.entity';

export class UpdatePreferenceDto extends UserPreference {}
