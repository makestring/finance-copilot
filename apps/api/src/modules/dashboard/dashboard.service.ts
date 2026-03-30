import { Injectable } from "@nestjs/common";
import { ScoreService } from "../score/score.service";
import { InsightsService } from "../insights/insights.service";
import { AlertsService } from "../alerts/alerts.service";
import { ActionHistoryService } from "../actions/action-history.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

function toBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreService: ScoreService,
    private readonly insightsService: InsightsService,
    private readonly alertsService: AlertsService,
    private readonly historyService: ActionHistoryService,
  ) {}

  private async findActiveSubscriptionByName(clientId: string, name: string) {
    return this.prisma.subscription.findFirst({
      where: {
        clientId,
        isActive: true,
        name,
      },
      orderBy: {
        amountCents: "desc",
      },
    });
  }

  async getOverview(clientId: string) {
    const score = await this.scoreService.getMonthlyScore(clientId);
    const insights = await this.insightsService.getActions(clientId);
    const alerts = await this.alertsService.list(clientId, 20);
    const history = await this.historyService.list(clientId, 5);
    const suggestionsResult = await this.scoreService.getSuggestions(clientId);

    const suggestions = suggestionsResult?.data?.suggestions ?? [];
    const topSuggestion = suggestions.find((s: any) => s.isTopRecommendation);

    const alertItems = alerts?.data?.items ?? [];
    const unreadCount = alerts?.meta?.unreadCount ?? 0;

    const warningCount = alertItems.filter((a: any) => a.severity === "warning").length;
    const infoCount = alertItems.filter((a: any) => a.severity === "info").length;
    const dangerCount = alertItems.filter((a: any) => a.severity === "danger").length;

    const currentScore = score.score.value;
    const scoreHeadline = insights?.summary?.scoreHeadline ?? `${currentScore}`;

    const monthlyPotentialCents = insights?.summary?.monthlySavingsCents ?? 0;
    const yearlyPotentialCents = insights?.summary?.yearlySavingsCents ?? 0;

    let topAction: any = null;

    if (topSuggestion) {
      if (topSuggestion.key === "cut_one_subscription" && topSuggestion.items?.length > 0) {
        const item = topSuggestion.items[0];
        const matchingSub = await this.findActiveSubscriptionByName(clientId, item.name);

        topAction = {
          type: "CUT_SUBSCRIPTION",
          label: `Cancelar ${item.name}`,
          subscriptionName: item.name,
          impactLabel: `+${topSuggestion.estimatedScoreDelta} pontos`,
          monthlySavingsFormatted: toBRL(item.monthlySavingsCents ?? 0),
          ctaLabel: "Resolver agora",
          action: matchingSub
            ? {
                kind: "api",
                method: "POST",
                path: `/subscriptions/${matchingSub.id}/confirm-cancel`,
              }
            : {
                kind: "navigate",
                screen: "subscriptions",
              },
        };
      } else if (topSuggestion.key === "adjust_threshold") {
        topAction = {
          type: "ADJUST_THRESHOLD",
          label: "Ajustar limite de assinaturas",
          impactLabel: `+${topSuggestion.estimatedScoreDelta} pontos`,
          ctaLabel: "Revisar configuração",
          action: {
            kind: "navigate",
            screen: "settings/subscriptions-threshold",
          },
        };
      }
    }

    if (!topAction && insights?.topAction) {
      topAction = {
        ...insights.topAction,
        ctaLabel: "Resolver agora",
      };
    }

    if (!topAction && alertItems.length > 0) {
      const first = alertItems[0];

      if (first.type === "UPCOMING_BILLING") {
        const payload = first?.payload as any;
        const firstItem = payload?.items?.[0];

        topAction = firstItem
          ? {
              type: "VIEW_UPCOMING_BILLING",
              label: `Revisar cobrança do ${firstItem.name}`,
              subscriptionId: firstItem.subscriptionId,
              ctaLabel: "Resolver agora",
            }
          : {
              type: "VIEW_ALERTS",
              label: "Ver alertas",
              ctaLabel: "Resolver agora",
            };
      } else {
        topAction = {
          type: "VIEW_ALERTS",
          label: "Ver alertas",
          ctaLabel: "Resolver agora",
        };
      }
    }

    const recentActivity = (history?.data?.items ?? []).map((item: any) => {
      let summary = item.type;

      if (item.type === "SUBSCRIPTION_CANCEL_CONFIRMED") {
        const name = item?.payload?.name ?? "Assinatura";
        summary = `${name} cancelada`;
      }

      return {
        id: item.id,
        type: item.type,
        createdAt: item.createdAt,
        summary,
      };
    });

    return {
      ok: true,
      score: {
        value: currentScore,
        level: score.score.level,
        headline: scoreHeadline,
        label:
          currentScore >= 80
            ? "Saúde financeira excelente"
            : currentScore >= 50
              ? "Saúde financeira estável"
              : "Atenção às finanças",
      },
      savings: {
        monthlyPotentialCents,
        yearlyPotentialCents,
        monthlyFormatted: toBRL(monthlyPotentialCents),
        yearlyFormatted: toBRL(yearlyPotentialCents),
      },
      alertsSummary: {
        total: alertItems.length,
        unread: unreadCount,
        warning: warningCount,
        info: infoCount,
        danger: dangerCount,
        hasAlerts: alertItems.length > 0,
      },
      topAction,
      recentActivity,
      ui: {
        highlightCard:
          monthlyPotentialCents > 0
            ? {
                type: "SAVINGS_OPPORTUNITY",
                title: "Você pode economizar",
                value: toBRL(monthlyPotentialCents),
                subtitle: `${toBRL(yearlyPotentialCents)} por ano`,
              }
            : alertItems.length > 0
              ? {
                  type: "ALERT",
                  title: "Você tem alertas",
                  value: `${alertItems.length} ativo(s)`,
                }
              : {
                  type: "HEALTHY",
                  title: "Tudo sob controle",
                  value: "Sem pendências",
                },
      },
    };
  }
}