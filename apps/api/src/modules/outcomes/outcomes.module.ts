import { Module } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { OutcomesController } from './outcomes.controller';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { OutcomesJob } from './outcomes.job';

@Module({
  imports: [PrismaModule],
  providers: [OutcomesService, OutcomesJob],
  controllers: [OutcomesController],
  exports: [OutcomesService],
})
export class OutcomesModule {}