import { Injectable } from "@nestjs/common";
import { ScoreService } from "../score/score.service";
import { InsightsService } from "../insights/insights.service";
import { AlertsService } from "../alerts/alerts.service";
import { ActionHistoryService } from "../actions/action-history.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { OutcomesService } from "../outcomes/outcomes.service";

function toBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function formatActions(count: number) {
  return count === 1
    ? "1 ação com resultado real"
    : `${count} ações com resultado real`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreService: ScoreService,
    private readonly insightsService: InsightsService,
    private readonly alertsService: AlertsService,
    private readonly historyService: ActionHistoryService,
    private readonly outcomesService: OutcomesService,
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
    const outcomesSummary = await this.outcomesService.summary(clientId);

    const measuredCount = outcomesSummary.data.measuredCount;
    const pendingOutcomesCount = outcomesSummary.data.pendingCount;
    const actualSavingsFormatted = toBRL(outcomesSummary.data.actualSavingsCents);

    const financialStory =
      outcomesSummary.data.actualSavingsCents > 0
        ? {
            headline: `Você já economizou ${actualSavingsFormatted}`,
            subheadline: formatActions(measuredCount),
            status: "positive",
          }
        : pendingOutcomesCount > 0
          ? {
              headline: "Estamos acompanhando seus resultados",
              subheadline:
                pendingOutcomesCount === 1
                  ? "1 ação ainda em medição"
                  : `${pendingOutcomesCount} ações ainda em medição`,
              status: "tracking",
            }
          : {
              headline: "Sua jornada financeira está começando",
              subheadline: "Execute ações para gerar resultados reais",
              status: "neutral",
            };

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

    if (topAction && outcomesSummary.data.completedCount > 0) {
      topAction = {
        ...topAction,
        performance: {
          successRate: outcomesSummary.data.successRate,
          measuredCount: outcomesSummary.data.measuredCount,
          actualSavingsCents: outcomesSummary.data.actualSavingsCents,
          actualSavingsFormatted: toBRL(outcomesSummary.data.actualSavingsCents),
        },
      };
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

    const hero =
      outcomesSummary.data.actualSavingsCents > 0
        ? {
            type: "RESULT",
            title: "Você já gerou resultado",
            headline: `+ ${toBRL(outcomesSummary.data.actualSavingsCents)} em economia`,
            subtitle: formatActions(outcomesSummary.data.measuredCount),
            tone: "positive",
          }
        : monthlyPotentialCents > 0
          ? {
              type: "OPPORTUNITY",
              title: "Sua maior oportunidade agora",
              headline: toBRL(monthlyPotentialCents),
              subtitle: `${toBRL(yearlyPotentialCents)} por ano em potencial`,
              tone: "action",
            }
          : {
              type: "STATUS",
              title: "Tudo sob controle",
              headline: "Sem pendências críticas",
              subtitle: "Continue acompanhando sua evolução",
              tone: "neutral",
            };

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
        hero,
        highlightCard:
          outcomesSummary.data.actualSavingsCents > 0
            ? {
                type: "REALIZED_SAVINGS",
                title: "Você já economizou",
                value: toBRL(outcomesSummary.data.actualSavingsCents),
                subtitle: formatActions(outcomesSummary.data.measuredCount),
              }
            : monthlyPotentialCents > 0
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

      outcomes: {
        totalCount: outcomesSummary.data.totalCount,
        measuredCount: outcomesSummary.data.measuredCount,
        pendingCount: outcomesSummary.data.pendingCount,
        partialCount: outcomesSummary.data.partialCount,
        missedCount: outcomesSummary.data.missedCount,
        completedCount: outcomesSummary.data.completedCount,
        successRate: outcomesSummary.data.successRate,
        actualSavingsCents: outcomesSummary.data.actualSavingsCents,
        actualSavingsFormatted: toBRL(outcomesSummary.data.actualSavingsCents),
      },

      financialStory,
    };
  }
}