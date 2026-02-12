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
