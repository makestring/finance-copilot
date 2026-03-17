import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { InsightsController } from "./insights.controller";
import { InsightsService } from "./insights.service";
import { ScoreModule } from "../score/score.module";

@Module({
  imports: [PrismaModule, ScoreModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService], // ✅ ESSENCIAL para ActionsModule conseguir usar
})
export class InsightsModule {}
