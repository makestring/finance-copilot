import { Injectable } from "@nestjs/common";
import { ScoreService } from "../score/score.service";
import { InsightsService } from "../insights/insights.service";
import { AlertsService } from "../alerts/alerts.service";
import { ActionHistoryService } from "../actions/action-history.service";

function toBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly scoreService: ScoreService,
    private readonly insightsService: InsightsService,
    private readonly alertsService: AlertsService,
    private readonly historyService: ActionHistoryService,
  ) {}

  async getOverview(clientId: string) {
    const score = await this.scoreService.getMonthlyScore(clientId);
    const insights = await this.insightsService.getActions(clientId);
    const alerts = await this.alertsService.list(clientId, 20);
    const history = await this.historyService.list(clientId, 5);

    const alertItems = alerts?.items ?? [];

    const warningCount = alertItems.filter((a: any) => a.severity === "warning").length;
    const infoCount = alertItems.filter((a: any) => a.severity === "info").length;
    const dangerCount = alertItems.filter((a: any) => a.severity === "danger").length;

    const currentScore = score.score.value;
    const scoreHeadline = insights?.summary?.scoreHeadline ?? `${currentScore}`;

    const monthlyPotentialCents = insights?.summary?.monthlySavingsCents ?? 0;
    const yearlyPotentialCents = insights?.summary?.yearlySavingsCents ?? 0;

    let topAction: any = insights?.topAction ?? null;

    // fallback: se não houver topAction do insights, deriva dos alerts
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
            }
          : {
              type: "VIEW_ALERTS",
              label: "Ver alertas",
            };
      } else {
        topAction = {
          type: "VIEW_ALERTS",
          label: "Ver alertas",
        };
      }
    }

    const recentActivity = (history?.items ?? []).map((item: any) => {
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
        warning: warningCount,
        info: infoCount,
        danger: dangerCount,
        hasAlerts: alertItems.length > 0,
      },

      topAction: topAction
        ? {
            ...topAction,
            ctaLabel: "Resolver agora",
          }
        : null,

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