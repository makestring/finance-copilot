import { Injectable } from '@nestjs/common';
import { OutcomeSourceType, OutcomeStatus } from '@prisma/client';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class OutcomesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string) {
    const outcomes = await this.prisma.outcome.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ok: true,
      data: outcomes,
      meta: { count: outcomes.length },
      ui: {},
    };
  }

  async createFromCancellation(params: {
    clientId: string;
    actionLogId?: string;
    subscriptionId: string;
    subscriptionName: string;
    amountCents: number;
    scoreBefore: number;
    expectedScoreDelta: number;
  }) {
    const outcome = await this.prisma.outcome.create({
      data: {
        clientId: params.clientId,
        actionLogId: params.actionLogId,
        sourceType: OutcomeSourceType.CONFIRM_CANCELLATION,
        sourceReferenceId: params.subscriptionId,
        title: `Economia com cancelamento de ${params.subscriptionName}`,
        description: `Impacto esperado após o cancelamento da assinatura ${params.subscriptionName}.`,
        expectedScoreDelta: params.expectedScoreDelta,
        expectedSavingsCents: params.amountCents,
        baselineScore: params.scoreBefore,
        status: OutcomeStatus.PENDING,
        expectedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return outcome;
  }

  async recompute(clientId: string) {
    const pendingOutcomes = await this.prisma.outcome.findMany({
      where: {
        clientId,
        status: OutcomeStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const updatedOutcomes: any[] = [];

    for (const outcome of pendingOutcomes) {
      const latestSnapshot = await this.prisma.scoreSnapshot.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      });

      const actualSavingsCents =
        outcome.sourceType === OutcomeSourceType.CONFIRM_CANCELLATION
          ? outcome.expectedSavingsCents
          : 0;

      const measuredScore = latestSnapshot?.score ?? outcome.baselineScore ?? null;

      const actualScoreDelta =
        measuredScore !== null && outcome.baselineScore !== null
          ? measuredScore - outcome.baselineScore
          : null;

      let status: OutcomeStatus = OutcomeStatus.MISSED;

      const savingsMatched =
        actualSavingsCents >= (outcome.expectedSavingsCents ?? 0) &&
        (outcome.expectedSavingsCents ?? 0) > 0;

      const savingsPartial =
        actualSavingsCents > 0 &&
        actualSavingsCents < (outcome.expectedSavingsCents ?? 0);

      const scoreMatched =
        actualScoreDelta !== null &&
        actualScoreDelta >= (outcome.expectedScoreDelta ?? 0) &&
        (outcome.expectedScoreDelta ?? 0) > 0;

      const scorePartial =
        actualScoreDelta !== null &&
        actualScoreDelta > 0 &&
        actualScoreDelta < (outcome.expectedScoreDelta ?? 0);

      if (savingsMatched || scoreMatched) {
        status = OutcomeStatus.MEASURED;
      } else if (savingsPartial || scorePartial) {
        status = OutcomeStatus.PARTIAL;
      }

      const updated = await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: {
          actualSavingsCents,
          measuredScore,
          actualScoreDelta,
          measuredAt: new Date(),
          status,
        },
      });

      updatedOutcomes.push(updated);
    }

    return {
      ok: true,
      data: updatedOutcomes,
      meta: {
        processed: updatedOutcomes.length,
      },
      ui: {},
    };
  }

  async summary(clientId: string) {
    const outcomes = await this.prisma.outcome.findMany({
      where: { clientId },
    });

    const totalCount = outcomes.length;
    const measuredCount = outcomes.filter((o) => o.status === 'MEASURED').length;
    const pendingCount = outcomes.filter((o) => o.status === 'PENDING').length;
    const partialCount = outcomes.filter((o) => o.status === 'PARTIAL').length;
    const missedCount = outcomes.filter((o) => o.status === 'MISSED').length;

    const expectedSavingsCents = outcomes.reduce(
      (sum, o) => sum + (o.expectedSavingsCents ?? 0),
      0,
    );

    const actualSavingsCents = outcomes.reduce(
      (sum, o) => sum + (o.actualSavingsCents ?? 0),
      0,
    );

    const completedCount = measuredCount + partialCount + missedCount;
    const successRate =
      completedCount > 0 ? Math.round((measuredCount / completedCount) * 100) : 0;

    return {
      ok: true,
      data: {
        totalCount,
        measuredCount,
        pendingCount,
        partialCount,
        missedCount,
        completedCount,
        successRate,
        expectedSavingsCents,
        actualSavingsCents,
      },
      meta: {},
      ui: {},
    };
  }
}