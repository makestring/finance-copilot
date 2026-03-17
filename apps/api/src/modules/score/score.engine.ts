// apps/api/src/modules/score/score.engine.ts

export type ScoreLevel = "GREEN" | "YELLOW" | "RED";

export type Driver = {
  key: string;
  label: string;
  value: number;
  impact: "positive" | "neutral" | "negative";
  details?: string;
};

export type ScoreInput = {
  incomeCents: number;
  fixedCents: number;
  subsCents: number;

  // User settings
  thresholdPct: number; // subscriptionsThresholdPct
  upcomingCount: number;
  upcomingWindowDays: number;
};

export type ScoreOutput = {
  value: number;
  level: ScoreLevel;
  drivers: Driver[];
  ratios: {
    fixedRatio: number;
    subsRatio: number;
  };
};

export class ScoreEngine {
  static compute(input: ScoreInput): ScoreOutput {
    const {
      incomeCents,
      fixedCents,
      subsCents,
      thresholdPct,
      upcomingCount,
      upcomingWindowDays,
    } = input;

    const drivers: Driver[] = [];
    let score = 100;

    const saldoReal = incomeCents - fixedCents;

    const fixedRatio = incomeCents > 0 ? fixedCents / incomeCents : 1;
    const subsRatio = saldoReal > 0 ? subsCents / saldoReal : 1;

    // Rule 0: saldo real <= 0 => critical
    if (saldoReal <= 0) {
      score = 25;
      drivers.push({
        key: "saldo_real",
        label: "Saldo real",
        value: saldoReal,
        impact: "negative",
        details: "Seu saldo real estimado está zero ou negativo.",
      });
      return ScoreEngine.out(score, drivers, fixedRatio, subsRatio);
    }

    drivers.push({
      key: "saldo_real",
      label: "Saldo real",
      value: saldoReal,
      impact: "positive",
      details: "Você tem saldo real positivo após gastos fixos.",
    });

    // A) Fixed expenses ratio penalties
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

    // B) Subscriptions ratio penalties (settings-based)
    const thresholdRatio = thresholdPct / 100;
    const warnBoundary = thresholdRatio * 2;
    const pctUsed = subsRatio * 100;

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

    // C) Upcoming billing penalty (light)
    if (upcomingCount > 0) {
      const penalty = Math.min(10, upcomingCount * 2);
      score -= penalty;

      drivers.push({
        key: "upcoming_billing",
        label: "Cobranças próximas",
        value: upcomingCount,
        impact: "neutral",
        details: `Você tem ${upcomingCount} cobrança(s) chegando nos próximos ${upcomingWindowDays} dias (penalidade leve de ${penalty} pts).`,
      });
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return ScoreEngine.out(score, drivers, fixedRatio, subsRatio);
  }

  private static out(
    score: number,
    drivers: Driver[],
    fixedRatio: number,
    subsRatio: number,
  ): ScoreOutput {
    const level: ScoreLevel = score >= 75 ? "GREEN" : score >= 50 ? "YELLOW" : "RED";
    return {
      value: score,
      level,
      drivers,
      ratios: { fixedRatio, subsRatio },
    };
  }
}
