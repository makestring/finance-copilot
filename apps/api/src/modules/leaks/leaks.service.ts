import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class LeaksService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });

    if (!profile) throw new NotFoundException("Profile not found. POST /onboarding/profile first.");

    const income = profile.monthlyIncomeCents;
    const fixedTotal = profile.fixedExpenses.reduce((sum, e) => sum + e.amountCents, 0);
    const saldoReal = income - fixedTotal;

    const subs = await this.prisma.subscription.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ amountCents: "desc" }],
    });

    const subsMonthly = subs.reduce((s, x) => s + x.amountCents, 0);
    const ratio = saldoReal > 0 ? subsMonthly / saldoReal : 1;

    // heurística MVP: se assinaturas consomem >= 10% do saldo real, recomendar revisão
    const needsReview = ratio >= 0.10;

    return {
      ok: true,
      leaks: {
        subscriptions: {
          count: subs.length,
          monthlyTotalCents: subsMonthly,
          yearlyTotalCents: subsMonthly * 12,
          top3: subs.slice(0, 3).map((s) => ({ name: s.name, amountCents: s.amountCents })),
        },
      },
      context: {
        saldoRealCents: saldoReal,
        subscriptionsToSaldoRatio: ratio,
      },
      insight: {
        type: needsReview ? "REVIEW_SUBSCRIPTIONS" : "OK",
        message: needsReview
          ? "Suas assinaturas estão consumindo uma fatia alta do seu saldo real. Quer revisar e cortar 1–2?"
          : "Suas assinaturas estão sob controle em relação ao seu saldo real.",
      },
    };
  }
}
