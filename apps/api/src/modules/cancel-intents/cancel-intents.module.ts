import { Module } from '@nestjs/common';
import { CancelIntentsService } from './cancel-intents.service';
import { CancelIntentsController } from './cancel-intents.controller';

@Module({
  providers: [CancelIntentsService],
  controllers: [CancelIntentsController]
})
export class CancelIntentsModule {}
