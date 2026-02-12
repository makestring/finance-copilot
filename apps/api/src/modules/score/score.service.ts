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
    });
    const subsMonthly = subs.reduce((s, x) => s + x.amountCents, 0);

    // ratios
    const fixedRatio = income > 0 ? fixedTotal / income : 1;
    const subsRatio = saldoReal > 0 ? subsMonthly / saldoReal : 1;

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
      return this.format(score, drivers, { income, fixedTotal, subsMonthly, saldoReal, fixedRatio, subsRatio });
    } else {
      drivers.push({
        key: "saldo_real",
        label: "Saldo real",
        value: saldoReal,
        impact: "positive",
        details: "Você tem saldo real positivo após gastos fixos.",
      });
    }

    // A) fixedRatio penalties
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

    // B) subsRatio penalties
    if (subsRatio <= 0.1) {
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "positive",
        details: `Assinaturas consomem ${(subsRatio * 100).toFixed(1)}% do seu saldo real.`,
      });
    } else if (subsRatio <= 0.2) {
      score -= 10;
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "neutral",
        details: `Assinaturas consomem ${(subsRatio * 100).toFixed(1)}% do seu saldo real (atenção).`,
      });
    } else {
      score -= 20;
      drivers.push({
        key: "subs_ratio",
        label: "Assinaturas vs saldo real",
        value: subsRatio,
        impact: "negative",
        details: `Assinaturas consomem ${(subsRatio * 100).toFixed(1)}% do seu saldo real (alto).`,
      });
    }

    // clamp
    score = Math.max(0, Math.min(100, score));

    return this.format(score, drivers, { income, fixedTotal, subsMonthly, saldoReal, fixedRatio, subsRatio });
  }

  private format(
    score: number,
    drivers: Driver[],
    ctx: {
      income: number;
      fixedTotal: number;
      subsMonthly: number;
      saldoReal: number;
      fixedRatio: number;
      subsRatio: number;
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
