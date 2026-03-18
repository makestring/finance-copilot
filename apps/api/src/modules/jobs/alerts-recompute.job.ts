import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { AlertsService } from "../alerts/alerts.service";

@Injectable()
export class AlertsRecomputeJob {
  private readonly logger = new Logger(AlertsRecomputeJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  // roda todo dia às 07:00
  @Cron("0 7 * * *")
  async handle() {
    this.logger.log("Starting daily alerts recompute job");

    const clients = await this.prisma.client.findMany({
      select: { id: true },
    });

    for (const client of clients) {
      try {
        await this.alertsService.recompute(client.id);
        this.logger.log(`Alerts recomputed for client ${client.id}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to recompute alerts for client ${client.id}: ${error?.message ?? error}`,
        );
      }
    }

    this.logger.log("Finished daily alerts recompute job");
  }
}