import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

function toBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string, limit = 20) {
    const items = await this.prisma.alert.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: Math.min(100, Math.max(1, limit)),
    });

    return { ok: true, items };
  }

  async recompute(clientId: string) {
    // precisa do profile
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });
    if (!profile) throw new NotFoundException("Profile not found. POST /onboarding/profile first.");

    const settings = await this.prisma.userSettings.findUnique({ where: { clientId } });
    const thresholdPct = settings?.subscriptionsThresholdPct ?? 10;
    const upcomingDays = settings?.upcomingBillingWindowDays ?? 5;

    const income = profile.monthlyIncomeCents;
    const fixedTotal = profile.fixedExpenses.reduce((s, e) => s + e.amountCents, 0);
    const saldoReal = income - fixedTotal;

    const subs = await this.prisma.subscription.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ amountCents: "desc" }],
    });

    const subsMonthly = subs.reduce((s, x) => s + x.amountCents, 0);
    const ratio = saldoReal > 0 ? subsMonthly / saldoReal : 1;
    const thresholdRatio = thresholdPct / 100;

    // estratégia MVP: desativar alertas antigos do “tipo” e inserir novos
    const toCreate: any[] = [];

    // 1) HIGH_SUBSCRIPTION_WEIGHT
    if (ratio > thresholdRatio) {
      const pctUsed = (ratio * 100).toFixed(1);
      toCreate.push({
        clientId,
        type: "HIGH_SUBSCRIPTION_WEIGHT",
        severity: "warning",
        title: "Assinaturas acima do seu limite",
        message: `Assinaturas consomem ${pctUsed}% do seu saldo real (limite: ${thresholdPct}%).`,
        payload: { ratio, thresholdPct, subsMonthlyCents: subsMonthly, saldoRealCents: saldoReal },
      });
    }

    // 2) UPCOMING_BILLING
    const today = new Date();
    const todayDay = today.getDate();

    const upcoming = subs
      .map((s) => ({ ...s, diff: s.billingDay - todayDay }))
      .filter((s) => s.diff >= 0 && s.diff <= upcomingDays)
      .sort((a, b) => a.diff - b.diff);

    if (upcoming.length > 0) {
      const totalUpcoming = upcoming.reduce((acc, s) => acc + s.amountCents, 0);
      toCreate.push({
        clientId,
        type: "UPCOMING_BILLING",
        severity: "info",
        title: "Cobranças de assinaturas chegando",
        message: `Você tem ${upcoming.length} cobrança(s) nos próximos ${upcomingDays} dias (total: ${toBRL(totalUpcoming)}).`,
        payload: {
          windowDays: upcomingDays,
          items: upcoming.map((s) => ({
            subscriptionId: s.id,
            name: s.name,
            amountCents: s.amountCents,
            billingDay: s.billingDay,
            inDays: s.diff,
          })),
        },
      });
    }

    // desativa alertas antigos desses tipos
    const types = ["HIGH_SUBSCRIPTION_WEIGHT", "UPCOMING_BILLING"];
    await this.prisma.alert.updateMany({
      where: { clientId, type: { in: types }, isActive: true },
      data: { isActive: false },
    });

      const created: any[] = [];
      for (const data of toCreate) {
      created.push(await this.prisma.alert.create({ data }));
      }

return { ok: true, createdCount: created.length, created };
  }
}