import { Test, TestingModule } from '@nestjs/testing';
import { CancelIntentsController } from './cancel-intents.controller';

describe('CancelIntentsController', () => {
  let controller: CancelIntentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CancelIntentsController],
    }).compile();

    controller = module.get<CancelIntentsController>(CancelIntentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
