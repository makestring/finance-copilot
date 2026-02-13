import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

type Driver = {
  key: string;
  label: string;
  value: number;
  impact: "positive" | "neutral" | "negative";
  details?: string;
};

@Injectable()
export class ScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyScore(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found. POST /onboarding/profile first.");
    }

    const income = profile.monthlyIncomeCents;
    const fixedTotal = profile.fixedExpenses.reduce((s, e) => s + e.amountCents, 0);
    const saldoReal = income - fixedTotal;

    const subs = await this.prisma.subscription.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ amountCents: "desc" }],
    });
    const subsMonthly = subs.reduce((s, x) => s + x.amountCents, 0);

    const settings = await this.prisma.userSettings.findUnique({
      where: { clientId },
    });

    const thresholdPct = settings?.subscriptionsThresholdPct ?? 10;
    const upcomingWindowDays = settings?.upcomingBillingWindowDays ?? 5;

    const fixedRatio = income > 0 ? fixedTotal / income : 1;
    const subsRatio = saldoReal > 0 ? subsMonthly / saldoReal : 1;
    const thresholdRatio = thresholdPct / 100;

    const drivers: Driver[] = [];
    let score = 100;

    if (saldoReal <= 0) {
      score = 25;
      drivers.push({
        key: "saldo_real",
        label: "Saldo real",
        value: saldoReal,
        impact: "negative",
        details: "Seu saldo real estimado está zero ou negativo.",
      });
      return this.format(score, drivers, {
        income,
        fixedTotal,
        subsMonthly,
        saldoReal,
      });
    }

    drivers.push({
      key: "saldo_real",
      label: "Saldo real",
      value: saldoReal,
      impact: "positive",
      details: "Você tem saldo real positivo após gastos fixos.",
    });

    if (fixedRatio <= 0.5) {
      drivers.push({
        key: "fixed_ratio",
        label: "Gastos fixos vs renda",
        value: fixedRatio,
        impact: "positive",
        details: `Gastos fixos estão em ${(fixedRatio * 100).toFixed(1)}% da sua renda.`,
      });
    } else if (fixedRatio <= 0.7) {
      score -= 15;
      drivers.push({
        key: "fixed_ratio",
        label: "Gastos fixos vs renda",
        value: fixedRatio,
        impact: "neutral",
        details: `Gastos fixos estão em ${(fixedRatio * 100).toFixed(1)}% da sua renda (atenção).`,
      });
    } else {
      score -= 35;
      drivers.push({
        key: "fixed_ratio",
        label: "Gastos fixos vs renda",
        value: fixedRatio,
        impact: "negative",
        details: `Gastos fixos estão em ${(fixedRatio * 100).toFixed(1)}% da sua renda (alto).`,
      });
    }

    const pctUsed = subsRatio * 100;
    const warnBoundary = thresholdRatio * 2;

    if (subsRatio <= thresholdRatio) {
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "positive",
        details: `Assinaturas consomem ${pctUsed.toFixed(1)}% do seu saldo real (limite: ${thresholdPct}%).`,
      });
    } else if (subsRatio <= warnBoundary) {
      score -= 10;
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "neutral",
        details: `Assinaturas consomem ${pctUsed.toFixed(1)}% do seu saldo real (acima do seu limite de ${thresholdPct}%).`,
      });
    } else {
      score -= 20;
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "negative",
        details: `Assinaturas consomem ${pctUsed.toFixed(1)}% do seu saldo real (bem acima do seu limite de ${thresholdPct}%).`,
      });
    }

    const todayDay = new Date().getDate();
    const upcoming = subs.filter((s) => {
      const diff = s.billingDay - todayDay;
      return diff >= 0 && diff <= upcomingWindowDays;
    });

    if (upcoming.length > 0) {
      const penalty = Math.min(10, upcoming.length * 2);
      score -= penalty;

      drivers.push({
        key: "upcoming_billing",
        label: "Cobranças próximas",
        value: upcoming.length,
        impact: "neutral",
        details: `Você tem ${upcoming.length} cobrança(s) chegando nos próximos ${upcomingWindowDays} dias (penalidade leve de ${penalty} pts).`,
      });
    }

    score = Math.max(0, Math.min(100, score));

    return this.format(score, drivers, {
      income,
      fixedTotal,
      subsMonthly,
      saldoReal,
    });
  }

  async createSnapshot(clientId: string) {
    const result = await this.getMonthlyScore(clientId);

    const snapshot = await this.prisma.scoreSnapshot.create({
      data: {
        clientId,
        score: result.score.value,
        level: result.score.level,
        drivers: result.drivers as any,
        context: result.context as any,
      },
    });

    return { ok: true, snapshot };
  }

  async getTrend(clientId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);

    const items = await this.prisma.scoreSnapshot.findMany({
      where: { clientId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        score: true,
        level: true,
        drivers: true,
      },
    });

    const points = items.map((it: any) => {
      const drivers = Array.isArray(it.drivers) ? it.drivers : [];

      const summaryDrivers = drivers
        .filter((d: any) => d.impact !== "positive")
        .slice(0, 2)
        .map((d: any) => ({
          key: d.key,
          label: d.label,
        }));

      return {
        id: it.id,
        createdAt: it.createdAt,
        score: it.score,
        level: it.level,
        summaryDrivers,
      };
    });

    const first = items[0]?.score ?? null;
    const last = items[items.length - 1]?.score ?? null;
    const delta = first !== null && last !== null ? last - first : null;

    return { ok: true, trend: { days, points, delta } };
  }

  async getSuggestions(clientId: string) {
    const base = await this.getMonthlyScore(clientId);

    const settings = await this.prisma.userSettings.findUnique({ where: { clientId } });
    const currentThreshold = settings?.subscriptionsThresholdPct ?? 10;

    const subs = await this.prisma.subscription.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ amountCents: "desc" }],
    });

    const saldoReal = base.context.saldoRealCents;
    const subsCents = base.context.subscriptionsCents;
    const fixedCents = base.context.fixedExpensesCents;
    const incomeCents = base.context.monthlyIncomeCents;

    const simulate = async (subsSim: number) => {
      const saldoSim = incomeCents - fixedCents;
      const subsRatio = saldoSim > 0 ? subsSim / saldoSim : 1;
      const thresholdRatio = currentThreshold / 100;
      const warnBoundary = thresholdRatio * 2;

      let score = 100;

      if (subsRatio > warnBoundary) score -= 20;
      else if (subsRatio > thresholdRatio) score -= 10;

      return Math.max(0, Math.min(100, score));
    };

    const suggestions: any[] = [];

    // -------- TOP 3 CUTS --------
    const perSubCuts = await Promise.all(
      subs.map(async (s) => {
        const newScore = await simulate(subsCents - s.amountCents);
        return {
          name: s.name,
          amountCents: s.amountCents,
          estimatedScoreDelta: newScore - base.score.value,
        };
      }),
    );

    const topCuts = perSubCuts
      .filter((x) => x.estimatedScoreDelta > 0)
      .sort((a, b) => b.estimatedScoreDelta - a.estimatedScoreDelta)
      .slice(0, 3);

    if (topCuts.length > 0) {
      suggestions.push({
        key: "cut_one_subscription",
        title: "Cortar uma assinatura",
        action: "Cancelar 1 assinatura",
        estimatedScoreDelta: topCuts[0].estimatedScoreDelta,
        items: topCuts,
        explanation:
          "Aqui estão as assinaturas com maior impacto estimado no seu score se você cancelar agora.",
      });
    }

    return { ok: true, baseScore: base.score, suggestions };
  }

  private format(
    score: number,
    drivers: Driver[],
    ctx: {
      income: number;
      fixedTotal: number;
      subsMonthly: number;
      saldoReal: number;
    },
  ) {
    const level = score >= 75 ? "GREEN" : score >= 50 ? "YELLOW" : "RED";

    return {
      ok: true,
      score: { value: score, level },
      context: {
        monthlyIncomeCents: ctx.income,
        fixedExpensesCents: ctx.fixedTotal,
        subscriptionsCents: ctx.subsMonthly,
        saldoRealCents: ctx.saldoReal,
      },
      drivers,
    };
  }
}
