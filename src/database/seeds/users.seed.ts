import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { User } from '../../user/entities/user.entity';
import { Role } from '../../roles/roles.decorator';
import { SeedModule } from './seed.module';

const SEED_USERS = [
  {
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@ftlwarehouse.com',
    plainPassword: 'Admin@1234',
    provider: 'local',
    roles: [Role.SUPER_ADMIN],
    is_active: true,
  },
  {
    first_name: 'Test',
    last_name: 'Customer',
    email: 'customer@ftlwarehouse.com',
    plainPassword: 'Customer@1234',
    provider: 'local',
    roles: [Role.STANDARD_USER],
    is_active: true,
  },
] as const;

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, bcrypt.genSaltSync());
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  const userModel = app.get<Model<User>>(getModelToken(User.name));

  for (const { plainPassword, ...userData } of SEED_USERS) {
    const password = hashPassword(plainPassword);
    const existing = await userModel.findOne({ email: userData.email });

    if (existing) {
      await userModel.updateOne(
        { email: userData.email },
        { $set: { ...userData, password } },
      );
      console.log(`♻️  Updated user: ${userData.email}`);
      continue;
    }

    await userModel.create({ ...userData, password });
    console.log(`✅ Created user: ${userData.email}`);
  }

  console.log('\nSeed complete.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
