import { Test, TestingModule } from '@nestjs/testing';
import { CancelIntentsService } from './cancel-intents.service';

describe('CancelIntentsService', () => {
  let service: CancelIntentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CancelIntentsService],
    }).compile();

    service = module.get<CancelIntentsService>(CancelIntentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
