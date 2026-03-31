import { Controller, Get, Post, Query } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';

@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Get('summary')
  summary(@Query('clientId') clientId: string) {
    return this.outcomesService.summary(clientId);
  }

  @Get()
  list(@Query('clientId') clientId: string) {
    return this.outcomesService.list(clientId);
  }

  @Post('recompute')
  recompute(@Query('clientId') clientId: string) {
    return this.outcomesService.recompute(clientId);
  }
}