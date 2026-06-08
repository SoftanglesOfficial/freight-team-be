import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Entity } from 'src/common/base.entity';
import { UserSecretType } from '../user-secret.service';

@Schema()
export class UserSecret extends Entity {
  @Prop({ type: String, required: true })
  secret: string;

  @Prop({ type: String, required: true })
  intent: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: String, required: true, enum: UserSecretType })
  type: UserSecretType;
}

export const UserSecretSchema = SchemaFactory.createForClass(UserSecret);
