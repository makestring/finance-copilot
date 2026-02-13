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

    // SETTINGS (defaults + per user)
    const settings = await this.prisma.userSettings.findUnique({
      where: { clientId },
    });
    const thresholdPct = settings?.subscriptionsThresholdPct ?? 10;
    const upcomingWindowDays = settings?.upcomingBillingWindowDays ?? 5;

    // ratios
    const fixedRatio = income > 0 ? fixedTotal / income : 1;
    const subsRatio = saldoReal > 0 ? subsMonthly / saldoReal : 1;
    const thresholdRatio = thresholdPct / 100;

    const drivers: Driver[] = [];

    // base score
    let score = 100;

    // hard rule: saldo real <= 0
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
    } else {
      drivers.push({
        key: "saldo_real",
        label: "Saldo real",
        value: saldoReal,
        impact: "positive",
        details: "Você tem saldo real positivo após gastos fixos.",
      });
    }

    // A) fixedRatio penalties (mantém o que já funcionou)
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

    // B) subsRatio penalties (AGORA baseado em settings)
    // Regras:
    // - <= thresholdPct: ok
    // - <= 2x thresholdPct: atenção
    // - > 2x thresholdPct: ruim
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

    // C) Penalidade leve baseada em ALERTAS (cobranças próximas)
    // Recalcula o mesmo "UPCOMING_BILLING" aqui, usando upcomingWindowDays do settings
    const today = new Date();
    const todayDay = today.getDate();

    const upcoming = subs.filter((s) => {
      const diff = s.billingDay - todayDay;
      return diff >= 0 && diff <= upcomingWindowDays;
    });

    if (upcoming.length > 0) {
      // penalidade pequena: 2 pontos por cobrança próxima (cap 10)
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

    // clamp
    score = Math.max(0, Math.min(100, score));

    return this.format(score, drivers, {
      income,
      fixedTotal,
      subsMonthly,
      saldoReal,
    });
  }
  async createSnapshot(clientId: string) {
    // Reusa o cálculo atual do score
    const result = await this.getMonthlyScore(clientId);

    const value = result.score.value;
    const level = result.score.level;

    const snapshot = await this.prisma.scoreSnapshot.create({
      data: {
        clientId,
        score: value,
        level,
        drivers: result.drivers as any,
        context: result.context as any,
      },
    });

    return { ok: true, snapshot };
  }

  async getTrend(clientId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await this.prisma.scoreSnapshot.findMany({
      where: {
        clientId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        score: true,
        level: true,
        // para trend não precisa trazer json pesado toda vez
      },
    });

    const first = items[0]?.score ?? null;
    const last = items[items.length - 1]?.score ?? null;

    const delta = first !== null && last !== null ? last - first : null;

    return {
      ok: true,
      trend: {
        days,
        points: items,
        delta,
      },
    };
  }

  async getSuggestions(clientId: string) {
    const base = await this.getMonthlyScore(clientId);

    // pegar settings atuais
    const settings = await this.prisma.userSettings.findUnique({ where: { clientId } });
    const currentThreshold = settings?.subscriptionsThresholdPct ?? 10;

    // contexto atual
    const saldoReal = base.context.saldoRealCents;
    const subsCents = base.context.subscriptionsCents;
    const fixedCents = base.context.fixedExpensesCents;
    const incomeCents = base.context.monthlyIncomeCents;

    // helper de simulação: recalcula score a partir de inputs simulados
    const simulate = async (opts: {
      thresholdPct?: number;
      subsCents?: number;
      fixedCents?: number;
    }) => {
      const thresholdPctSim = opts.thresholdPct ?? currentThreshold;
      const subsSim = opts.subsCents ?? subsCents;
      const fixedSim = opts.fixedCents ?? fixedCents;

      const saldoSim = incomeCents - fixedSim;
      const fixedRatio = incomeCents > 0 ? fixedSim / incomeCents : 1;
      const subsRatio = saldoSim > 0 ? subsSim / saldoSim : 1;
      const thresholdRatio = thresholdPctSim / 100;
      const warnBoundary = thresholdRatio * 2;

      let score = 100;

      if (saldoSim <= 0) return 25;

      // fixed ratio penalty
      if (fixedRatio > 0.7) score -= 35;
      else if (fixedRatio > 0.5) score -= 15;

      // subs ratio penalty based on threshold
      if (subsRatio > warnBoundary) score -= 20;
      else if (subsRatio > thresholdRatio) score -= 10;

      // não simulamos upcoming billing aqui (é evento temporal), então ignoramos
      return Math.max(0, Math.min(100, score));
    };

    const suggestions: any[] = [];

    // 1) Ajustar threshold para o padrão (10) ou para 2% se o usuário está muito rígido
    if (currentThreshold < 5) {
      const newScore = await simulate({ thresholdPct: 2 });
      const delta = newScore - base.score.value;

      suggestions.push({
        key: "adjust_threshold",
        title: "Ajustar seu limite de assinaturas",
        action: "Mudar subscriptionsThresholdPct para 2%",
        estimatedScoreDelta: delta,
        explanation: "Seu limite está muito rígido e isso derruba o score mesmo com assinaturas baixas.",
      });
    }

    // 2) Reduzir assinaturas (simula cortar 20% do total ou R$ 10)
    const cutSubs = Math.min(subsCents, Math.max(1000, Math.floor(subsCents * 0.2)));
    if (subsCents > 0) {
      const newScore = await simulate({ subsCents: subsCents - cutSubs });
      const delta = newScore - base.score.value;

      suggestions.push({
        key: "reduce_subscriptions",
        title: "Reduzir assinaturas",
        action: `Cortar ~R$ ${(cutSubs / 100).toFixed(2)}/mês em assinaturas`,
        estimatedScoreDelta: delta,
        explanation: "Cortar uma assinatura ou trocar por plano mais barato melhora seu score.",
      });
    }

    // 3) Reduzir gastos fixos (simula cortar 5% ou R$ 50)
    const cutFixed = Math.min(fixedCents, Math.max(5000, Math.floor(fixedCents * 0.05)));
    if (fixedCents > 0) {
      const newScore = await simulate({ fixedCents: fixedCents - cutFixed });
      const delta = newScore - base.score.value;

      suggestions.push({
        key: "reduce_fixed",
        title: "Reduzir gastos fixos",
        action: `Cortar ~R$ ${(cutFixed / 100).toFixed(2)}/mês em gastos fixos`,
        estimatedScoreDelta: delta,
        explanation: "Gastos fixos menores aumentam seu saldo real e melhoram seu score.",
      });
    }

    // ordena por maior ganho
    suggestions.sort((a, b) => (b.estimatedScoreDelta ?? 0) - (a.estimatedScoreDelta ?? 0));

    return {
      ok: true,
      baseScore: base.score,
      suggestions,
    };
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
      score: {
        value: score,
        level,
      },
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
