import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

function toBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
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

  const unreadCount = await this.prisma.alert.count({
    where: {
      clientId,
      isActive: true,
      isRead: false,
    },
  });

  return {
    ok: true,
    data: {
      items,
    },
    meta: {
      unreadCount,
    },
  };
}

  async unreadCount(clientId: string) {
    const count = await this.prisma.alert.count({
      where: {
        clientId,
        isActive: true,
        isRead: false,
      },
    });

    return { ok: true, count };
  }

  async markRead(clientId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        clientId,
        isActive: true,
      },
    });

    if (!alert) {
      throw new NotFoundException("Alert not found");
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { ok: true, alert: updated };
  }

  async dismiss(clientId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        clientId,
        isActive: true,
      },
    });

    if (!alert) {
      throw new NotFoundException("Alert not found");
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        isActive: false,
        dismissedAt: new Date(),
      },
    });

    return { ok: true, alert: updated };
  }

  async recompute(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found. POST /onboarding/profile first.");
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { clientId },
    });

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
        payload: {
          ratio,
          thresholdPct,
          subsMonthlyCents: subsMonthly,
          saldoRealCents: saldoReal,
        },
      });
    }

    // 2) UPCOMING_BILLING
    const todayDay = new Date().getDate();

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

    const types = ["HIGH_SUBSCRIPTION_WEIGHT", "UPCOMING_BILLING"];
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Alertas recentes (< 24h) ainda ativos — não serão recriados
    const recentAlerts = await this.prisma.alert.findMany({
      where: { clientId, type: { in: types }, isActive: true, createdAt: { gte: since24h } },
      select: { type: true },
    });
    const recentTypes = new Set(recentAlerts.map((a) => a.type));

    // Desativa apenas alertas cujas condições deixaram de ser válidas
    const toCreateTypes = new Set(toCreate.map((c: any) => c.type));
    const typesToDeactivate = types.filter((t) => !toCreateTypes.has(t));
    if (typesToDeactivate.length > 0) {
      await this.prisma.alert.updateMany({
        where: { clientId, type: { in: typesToDeactivate }, isActive: true },
        data: { isActive: false, dismissedAt: new Date() },
      });
    }

    // Cria apenas se não existe duplicata recente (cooldown 24h)
    const created: any[] = [];
    for (const data of toCreate) {
      if (recentTypes.has(data.type)) continue;
      created.push(await this.prisma.alert.create({ data }));
    }

    return {
      ok: true,
      createdCount: created.length,
      created,
    };
  }
}