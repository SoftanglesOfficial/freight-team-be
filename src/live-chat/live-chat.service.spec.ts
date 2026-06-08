import { Test, TestingModule } from '@nestjs/testing';
import { LiveChatService } from './live-chat.service';

describe('LiveChatService', () => {
  let service: LiveChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveChatService],
    }).compile();

    service = module.get<LiveChatService>(LiveChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
