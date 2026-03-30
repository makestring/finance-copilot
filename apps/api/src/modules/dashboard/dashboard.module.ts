import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ScoreModule } from "../score/score.module";
import { InsightsModule } from "../insights/insights.module";
import { AlertsModule } from "../alerts/alerts.module";
import { ActionsModule } from "../actions/actions.module";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";

@Module({
  imports: [ScoreModule, InsightsModule, AlertsModule, ActionsModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}