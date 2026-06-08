import { Test, TestingModule } from '@nestjs/testing';
import { UserSecretController } from './user-secret.controller';
import { UserSecretService } from './user-secret.service';

describe('UserSecretController', () => {
  let controller: UserSecretController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSecretController],
      providers: [UserSecretService],
    }).compile();

    controller = module.get<UserSecretController>(UserSecretController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
