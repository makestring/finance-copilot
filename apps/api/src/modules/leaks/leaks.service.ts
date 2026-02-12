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
    const ratio = saldoReal > 0 ? subsMonthly / saldoReal : 1;

    // =========================
    // ALERT ENGINE MVP
    // =========================
    const alerts: any[] = [];

    // 1) Peso das assinaturas vs saldo real (threshold fixo por enquanto)
    const THRESHOLD = 0.10; // 10%
    if (ratio >= THRESHOLD) {
      alerts.push({
        type: "HIGH_SUBSCRIPTION_WEIGHT",
        severity: "warning",
        ratio,
        message: `Suas assinaturas consomem ${(ratio * 100).toFixed(1)}% do seu saldo real.`,
      });
    }

    // 2) Cobranças próximas (janela de 5 dias)
    const today = new Date();
    const todayDay = today.getDate();
    const UPCOMING_WINDOW_DAYS = 5;

    const upcoming = subs.filter((s) => {
      const diff = s.billingDay - todayDay;
      return diff >= 0 && diff <= UPCOMING_WINDOW_DAYS;
    });

    if (upcoming.length > 0) {
      alerts.push({
        type: "UPCOMING_BILLING",
        severity: "info",
        message: `Você tem cobranças de assinatura nos próximos ${UPCOMING_WINDOW_DAYS} dias.`,
        items: upcoming.map((s) => ({
          name: s.name,
          amountCents: s.amountCents,
          billingDay: s.billingDay,
        })),
      });
    }

    return {
      ok: true,
      leaks: {
        subscriptions: {
          count: subs.length,
          monthlyTotalCents: subsMonthly,
          yearlyTotalCents: subsMonthly * 12,
          top3: subs.slice(0, 3).map((s) => ({
            name: s.name,
            amountCents: s.amountCents,
          })),
        },
      },
      context: {
        saldoRealCents: saldoReal,
        subscriptionsToSaldoRatio: ratio,
      },
      alerts,
    };
  }
}
