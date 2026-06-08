import { Global, Module } from '@nestjs/common';
import { UserSecretService } from './user-secret.service';
import { UserSecretController } from './user-secret.controller';
import { UserSecret, UserSecretSchema } from './entities/user-secret.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { RegisterEvents } from 'src/common/decorators/register-events.decorator';
import { USER_SECRET_EVENTS } from './user-secret.events';

@RegisterEvents(USER_SECRET_EVENTS)
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: UserSecret.name, schema: UserSecretSchema }])],
  controllers: [UserSecretController],
  providers: [UserSecretService],
  exports: [UserSecretService, MongooseModule],
})
export class UserSecretModule {}
