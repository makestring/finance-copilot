import { BadRequestException, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { ScoreService } from "./score.service";

@Controller("score")
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  @Get("monthly")
  async monthly(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getMonthlyScore(clientId);
  }

  @Post("snapshot")
  async snapshot(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.createSnapshot(clientId);
  }

  @Get("trend")
  async trend(
    @Headers("x-client-id") clientId: string,
    @Query("days") days?: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");

    const parsed = days ? Number(days) : 30;
    const safeDays = Number.isFinite(parsed) ? Math.max(1, Math.min(365, parsed)) : 30;

    return this.service.getTrend(clientId, safeDays);
  }
}
