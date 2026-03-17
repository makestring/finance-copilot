import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ScoreEngine } from "../score/score.engine";

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActions(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found. POST /onboarding/profile first.");
    }

    const incomeCents = profile.monthlyIncomeCents;
    const fixedCents = profile.fixedExpenses.reduce((s, e) => s + e.amountCents, 0);

    const subs = await this.prisma.subscription.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ amountCents: "desc" }],
    });
    const subsCents = subs.reduce((s, x) => s + x.amountCents, 0);

    const settings = await this.prisma.userSettings.findUnique({ where: { clientId } });
    const thresholdPct = settings?.subscriptionsThresholdPct ?? 10;
    const upcomingWindowDays = settings?.upcomingBillingWindowDays ?? 5;

    // upcomingCount (mesma regra do score real)
    const todayDay = new Date().getDate();
    const upcomingCount = subs.filter((s) => {
      const diff = s.billingDay - todayDay;
      return diff >= 0 && diff <= upcomingWindowDays;
    }).length;

    // Score atual (real)
    const current = ScoreEngine.compute({
      incomeCents,
      fixedCents,
      subsCents,
      thresholdPct,
      upcomingCount,
      upcomingWindowDays,
    });

    // Cancel intents + subscription
    const intents = await this.prisma.cancelIntent.findMany({
      where: { clientId },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    // dedupe por subscriptionId
    const seen = new Set<string>();
    const planned = intents
      .filter((it) => it.subscription)
      .filter((it) => {
        if (seen.has(it.subscriptionId)) return false;
        seen.add(it.subscriptionId);
        return true;
      })
      .map((it) => ({
        subscriptionId: it.subscriptionId,
        name: it.subscription!.name,
        amountCents: it.subscription!.amountCents,
      }));

    const plannedMonthlySavingsCents = planned.reduce((s, x) => s + x.amountCents, 0);
    const plannedYearlySavingsCents = plannedMonthlySavingsCents * 12;

    // Score projetado se confirmar TODOS os cancelamentos planejados
    const projectedAll = ScoreEngine.compute({
      incomeCents,
      fixedCents,
      subsCents: Math.max(0, subsCents - plannedMonthlySavingsCents),
      thresholdPct,
      upcomingCount: 0, // simulação ignora evento temporal
      upcomingWindowDays,
    });

    // delta estimado por item
    const plannedWithDelta = planned
      .map((p) => {
        const sim = ScoreEngine.compute({
          incomeCents,
          fixedCents,
          subsCents: Math.max(0, subsCents - p.amountCents),
          thresholdPct,
          upcomingCount: 0,
          upcomingWindowDays,
        });

        return {
          ...p,
          monthlySavingsCents: p.amountCents,
          yearlySavingsCents: p.amountCents * 12,
          estimatedScoreDelta: sim.value - current.value,
        };
      })
      .sort((a, b) => (b.estimatedScoreDelta - a.estimatedScoreDelta) || (b.amountCents - a.amountCents));

// ====== UI HEADLINES ======
const monthlySavingsFormatted = `R$ ${(plannedMonthlySavingsCents / 100).toFixed(2)}/mês`;

const scoreHeadline = `${current.value} → ${projectedAll.value} (+${projectedAll.value - current.value})`;

// ====== TOP ACTION ======
let topAction: null | {
  type: "CONFIRM_CANCELLATION";
  subscriptionId: string;
  label: string;
  estimatedScoreDelta: number;
} = null;

if (plannedWithDelta.length > 0) {
  const top = plannedWithDelta[0];
  topAction = {
    type: "CONFIRM_CANCELLATION",
    subscriptionId: top.subscriptionId,
    label: `Confirmar cancelamento da ${top.name}`,
    estimatedScoreDelta: top.estimatedScoreDelta,
  };
}

return {
  ok: true,
  summary: {
    plannedCancellationsCount: plannedWithDelta.length,
    monthlySavingsCents: plannedMonthlySavingsCents,
    yearlySavingsCents: plannedYearlySavingsCents,
    currentScore: current.value,
    projectedScoreIfAllConfirmed: projectedAll.value,

    // ⭐ novos campos UI-ready
    monthlySavingsFormatted,
    scoreHeadline,
  },
  topAction, // ⭐ CTA pronto
  plannedCancellations: plannedWithDelta,
};

  }
}
