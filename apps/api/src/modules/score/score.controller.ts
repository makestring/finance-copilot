import { BadRequestException, Controller, Get, Headers } from "@nestjs/common";
import { ScoreService } from "./score.service";

@Controller("score")
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  @Get("monthly")
  async monthly(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getMonthlyScore(clientId);
  }
}
