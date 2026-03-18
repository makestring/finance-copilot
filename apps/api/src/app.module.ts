import { Module } from "@nestjs/common";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SnapshotModule } from "./modules/snapshot/snapshot.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { LeaksModule } from "./modules/leaks/leaks.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { ScoreModule } from "./modules/score/score.module";
import { CancelIntentsModule } from './modules/cancel-intents/cancel-intents.module';
import { InsightsModule } from './modules/insights/insights.module';
import { ActionsModule } from "./modules/actions/actions.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { ScheduleModule } from "@nestjs/schedule";


@Module({
  imports: [PrismaModule, OnboardingModule, SnapshotModule, SubscriptionsModule, LeaksModule, SettingsModule, ScoreModule, CancelIntentsModule, InsightsModule, ActionsModule, AlertsModule, DashboardModule, JobsModule, ScheduleModule.forRoot()],
})
export class AppModule {}
