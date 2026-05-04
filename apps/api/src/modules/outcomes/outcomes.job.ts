import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { OutcomesService } from './outcomes.service';

@Injectable()
export class OutcomesJob {
  private readonly logger = new Logger(OutcomesJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outcomesService: OutcomesService,
  ) {}

  // roda 1x por dia às 03:00
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRecompute() {
    this.logger.log('Starting outcomes recompute job...');

    const clientsWithPending = await this.prisma.outcome.findMany({
      where: { status: 'PENDING', expectedAt: { lte: new Date() } },
      select: { clientId: true },
      distinct: ['clientId'],
    });

    let totalProcessed = 0;

    for (const client of clientsWithPending) {
      try {
        const result = await this.outcomesService.recompute(client.clientId);
        const count = result.meta.processed;
        totalProcessed += count;
        this.logger.log(`Client ${client.clientId}: ${count} outcome(s) processed`);
      } catch (error) {
        this.logger.error(
          `Error recomputing outcomes for client ${client.clientId}`,
          error,
        );
      }
    }

    this.logger.log(`Outcomes recompute job finished. Total processed: ${totalProcessed}`);
  }
}