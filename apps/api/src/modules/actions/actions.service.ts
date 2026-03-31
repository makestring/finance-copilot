import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ScoreService } from "../score/score.service";
import { InsightsService } from "../insights/insights.service";
import { ActionHistoryService } from "./action-history.service";
import { OutcomesService } from '../outcomes/outcomes.service';

function toBRL(cents: number) {
  // formato pt-BR com vírgula; UI-ready
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreService: ScoreService,
    private readonly insightsService: InsightsService,
    private readonly history: ActionHistoryService,
    private readonly outcomesService: OutcomesService,
  ) {}

  async confirmCancelSubscription(clientId: string, subscriptionId: string) {
    // 0) valida ownership
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, clientId },
    });

    if (!sub) {
      throw new NotFoundException("Subscription not found for this client.");
    }

    // 1) score BEFORE (antes de cancelar)
    const before = await this.scoreService.getMonthlyScore(clientId);
    const scoreBefore = before.score.value;

    // 2) transação: cancela + limpa intents
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { isActive: false },
      });

      await tx.cancelIntent.deleteMany({
        where: { clientId, subscriptionId },
      });

      return updatedSub;
    });

    // 3) score AFTER (snapshot persistido pra trend)
    const snapshot = await this.scoreService.createSnapshot(clientId);
    const scoreAfter = snapshot.snapshot.score;
    const diff = scoreAfter - scoreBefore;

    // 4) savings (simples: assinatura cancelada = economia mensal)
    const savingsMonthlyCents = updated.amountCents;
    const savingsYearlyCents = savingsMonthlyCents * 12;

    // 5) toast + headline (UI-ready)
    const toast =
      diff > 0
        ? `Cancelamento confirmado. Você economiza ${toBRL(
            savingsMonthlyCents,
          )}/mês (${toBRL(savingsYearlyCents)}/ano) e seu score subiu +${diff}.`
        : `Cancelamento confirmado. Você economiza ${toBRL(
            savingsMonthlyCents,
          )}/mês (${toBRL(savingsYearlyCents)}/ano).`;

    const scoreHeadline = `${scoreBefore} → ${scoreAfter} (${diff >= 0 ? "+" : ""}${diff})`;

    // 6) action log (AGORA as variáveis existem)
    const actionLog = await this.history.log(clientId, "SUBSCRIPTION_CANCEL_CONFIRMED", {
      subscriptionId,
      name: updated.name,
      amountCents: updated.amountCents,
      billingDay: updated.billingDay,
      scoreBefore,
      scoreAfter,
      diff,
      savingsMonthlyCents,
      savingsYearlyCents,
      occurredAt: new Date().toISOString(),
    });

    const outcome = await this.outcomesService.createFromCancellation({
      clientId,
      actionLogId: actionLog?.id,
      subscriptionId,
      subscriptionName: updated.name,
      amountCents: updated.amountCents,
      scoreBefore,
      expectedScoreDelta: diff > 0 ? diff : 0,
    });

    // 7) insights atualizados
    const insights = await this.insightsService.getActions(clientId);

    // opcional: sobrescreve headline no retorno do insights (se tiver summary)
    if ((insights as any)?.summary) {
      (insights as any).summary.scoreHeadline = scoreHeadline;
    }

    return {
      ok: true,
      toast,
      delta: { scoreBefore, scoreAfter, diff },
      savings: { monthlyCents: savingsMonthlyCents, yearlyCents: savingsYearlyCents },
      subscription: updated,
      scoreSnapshot: snapshot.snapshot,
      outcome,
      insights,
    };
  }
}
