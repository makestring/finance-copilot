import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";
import { AlertsModule } from "../alerts/alerts.module";
import { AlertsRecomputeJob } from "./alerts-recompute.job";

@Module({
  imports: [PrismaModule, AlertsModule],
  providers: [AlertsRecomputeJob],
})
export class JobsModule {}