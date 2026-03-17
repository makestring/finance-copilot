import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { ActionsController } from "./actions.controller";
import { ActionsService } from "./actions.service";
import { ScoreModule } from "../score/score.module";
import { InsightsModule } from "../insights/insights.module";
import { ActionHistoryService } from "./action-history.service";
import { ActionHistoryController } from "./action-history.controller";

@Module({
  imports: [PrismaModule, ScoreModule, InsightsModule],
  controllers: [ActionsController, ActionHistoryController],
  providers: [ActionsService, ActionHistoryService],
  exports: [ActionsService, ActionHistoryService],
})
export class ActionsModule {}
