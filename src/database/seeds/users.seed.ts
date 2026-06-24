import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../../user/entities/user.entity';
import { Role } from '../../roles/roles.decorator';

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, bcrypt.genSaltSync());
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(getModelToken(User.name));

  const users = [
    {
      first_name: 'Super',
      last_name: 'Admin',
      email: 'admin@ftlwarehouse.com',
      password: hashPassword('Admin@1234'),
      provider: 'local',
      roles: [Role.SUPER_ADMIN],
      is_active: true,
    },
    {
      first_name: 'Test',
      last_name: 'Customer',
      email: 'customer@ftlwarehouse.com',
      password: hashPassword('Customer@1234'),
      provider: 'local',
      roles: [Role.STANDARD_USER],
      is_active: true,
    },
  ];

  for (const userData of users) {
    const existing = await userModel.findOne({ email: userData.email });

    if (existing) {
      console.log(`⚠️  User already exists: ${userData.email} — skipping`);
      continue;
    }

    await userModel.create(userData);
    console.log(`✅ Created user: ${userData.email}`);
  }

  console.log('\nSeed complete.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
