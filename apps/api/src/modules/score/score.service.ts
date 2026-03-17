import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ScoreEngine, Driver as EngineDriver } from "./score.engine";

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

    // Upcoming billing count (mesma regra que antes)
    const todayDay = new Date().getDate();
    const upcomingCount = subs.filter((s) => {
      const diff = s.billingDay - todayDay;
      return diff >= 0 && diff <= upcomingWindowDays;
    }).length;

    const out = ScoreEngine.compute({
      incomeCents,
      fixedCents,
      subsCents,
      thresholdPct,
      upcomingCount,
      upcomingWindowDays,
    });

    const saldoRealCents = incomeCents - fixedCents;

    return {
      ok: true,
      score: {
        value: out.value,
        level: out.level,
      },
      context: {
        monthlyIncomeCents: incomeCents,
        fixedExpensesCents: fixedCents,
        subscriptionsCents: subsCents,
        saldoRealCents,
      },
      drivers: out.drivers as EngineDriver[],
    };
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
  // Base score (real)
  const base = await this.getMonthlyScore(clientId);

  // Contexto atual
  const incomeCents = base.context.monthlyIncomeCents;
  const fixedCents = base.context.fixedExpensesCents;
  const subsCents = base.context.subscriptionsCents;

  // Settings
  const settings = await this.prisma.userSettings.findUnique({ where: { clientId } });
  const thresholdPct = settings?.subscriptionsThresholdPct ?? 10;
  const upcomingWindowDays = settings?.upcomingBillingWindowDays ?? 5;

  // Subscriptions ativas
  const subs = await this.prisma.subscription.findMany({
    where: { clientId, isActive: true },
    orderBy: [{ amountCents: "desc" }],
  });

  // Simulador central (não inclui upcoming billing por ser temporal)
  const simulate = (params: { thresholdPct?: number; subsCents?: number; fixedCents?: number }) => {
    return ScoreEngine.compute({
      incomeCents,
      fixedCents: params.fixedCents ?? fixedCents,
      subsCents: params.subsCents ?? subsCents,
      thresholdPct: params.thresholdPct ?? thresholdPct,
      upcomingCount: 0,
      upcomingWindowDays,
    }).value;
  };

  const suggestions: any[] = [];

  // =========================
  // WOW: Cancelamentos planejados (CancelIntent)
  // =========================
  const intents = await this.prisma.cancelIntent.findMany({
    where: { clientId },
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  if (intents.length > 0) {
    // evita duplicar se usuário marcou a mesma assinatura mais de uma vez
    const seen = new Set<string>();

    const items: {
      subscriptionId: string;
      name: string;
      amountCents: number;
      monthlySavingsCents: number;
      yearlySavingsCents: number;
      estimatedScoreDelta: number;
    }[] = [];

    for (const it of intents) {
      if (!it.subscription) continue;
      if (seen.has(it.subscriptionId)) continue;
      seen.add(it.subscriptionId);

      const amount = it.subscription.amountCents;

      // simula como se essa assinatura já não existisse
      const simulatedScore = simulate({
        subsCents: Math.max(0, subsCents - amount),
      });

      const delta = simulatedScore - base.score.value;

      items.push({
        subscriptionId: it.subscriptionId,
        name: it.subscription.name,
        amountCents: amount,
        monthlySavingsCents: amount,
        yearlySavingsCents: amount * 12,
        estimatedScoreDelta: delta,
      });
    }

    // ordena por maior impacto, e se empatar, maior economia
    items.sort(
      (a, b) => (b.estimatedScoreDelta - a.estimatedScoreDelta) || (b.amountCents - a.amountCents),
    );

    const best = items[0];
    const totalMonthly = items.reduce((s, x) => s + x.monthlySavingsCents, 0);

    const projectedScoreValue = best ? Math.min(100, base.score.value + best.estimatedScoreDelta) : base.score.value;
    const projectedScoreLevel = projectedScoreValue >= 75 ? "GREEN" : projectedScoreValue >= 50 ? "YELLOW" : "RED";


    // coloca no TOPO = WOW
    suggestions.unshift({
      key: "pending_cancellations",
      title: "Você já marcou assinaturas para cancelar",
      action: "Confirmar cancelamento das assinaturas marcadas",
      estimatedScoreDelta: best ? best.estimatedScoreDelta : 0,
      projectedScoreValue,
      projectedScoreLevel,
      items,
      explanation: best
        ? `Se você confirmar agora, seu score pode subir em até +${best.estimatedScoreDelta} pts. Economia potencial total: R$ ${(totalMonthly / 100).toFixed(2)}/mês.`
        : "Você já marcou assinaturas para cancelar. Confirmar a ação melhora seu score.",
    });
  }

  // =========================
  // A) Ajustar threshold (produto)
  // =========================
  if (thresholdPct < 5) {
    const newScore = simulate({ thresholdPct: 2 });
    const delta = newScore - base.score.value;

    if (delta !== 0) {
      suggestions.push({
        key: "adjust_threshold",
        title: "Ajustar seu limite de assinaturas",
        action: "Mudar subscriptionsThresholdPct para 2%",
        estimatedScoreDelta: delta,
        explanation: "Seu limite está muito rígido e isso derruba o score mesmo com assinaturas baixas.",
      });
    }
  }

  // =========================
  // B) Cortar 1 assinatura (Top 3 por impacto)
  // =========================
  if (subs.length > 0 && subsCents > 0) {
    const perSubCuts = subs.map((s) => {
      const newScore = simulate({ subsCents: Math.max(0, subsCents - s.amountCents) });
      const delta = newScore - base.score.value;

      return {
        name: s.name,
        amountCents: s.amountCents,
        monthlySavingsCents: s.amountCents,
        yearlySavingsCents: s.amountCents * 12,
        estimatedScoreDelta: delta,
      };
    });

    const topCuts = perSubCuts
      .filter((x) => x.estimatedScoreDelta > 0)
      .sort(
        (a, b) =>
          (b.estimatedScoreDelta - a.estimatedScoreDelta) || (b.amountCents - a.amountCents),
      )
      .slice(0, 3);

    if (topCuts.length > 0) {
      suggestions.push({
        key: "cut_one_subscription",
        title: "Cortar uma assinatura",
        action: "Cancelar 1 assinatura",
        estimatedScoreDelta: topCuts[0].estimatedScoreDelta,
        items: topCuts,
        explanation: `Economia estimada: até R$ ${(topCuts[0].monthlySavingsCents / 100).toFixed(
          2,
        )}/mês (R$ ${(topCuts[0].yearlySavingsCents / 100).toFixed(2)}/ano).`,
      });
    }
  }

  // Ordena (mantém o WOW no topo porque usamos unshift)
  const first = suggestions[0]?.key === "pending_cancellations" ? suggestions.shift() : null;

  suggestions.sort(
    (a, b) =>
      (b.estimatedScoreDelta ?? 0) - (a.estimatedScoreDelta ?? 0) ||
      (b.items?.[0]?.amountCents ?? 0) - (a.items?.[0]?.amountCents ?? 0),
  );

  if (first) suggestions.unshift(first);

  return {
    ok: true,
    baseScore: base.score,
    suggestions,
  };
}

}
