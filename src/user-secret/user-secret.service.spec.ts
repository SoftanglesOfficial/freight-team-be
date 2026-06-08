import { Test, TestingModule } from '@nestjs/testing';
import { UserSecretService } from './user-secret.service';

describe('UserSecretService', () => {
  let service: UserSecretService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSecretService],
    }).compile();

    service = module.get<UserSecretService>(UserSecretService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
