import { BadRequestException, Controller, Get, Headers } from "@nestjs/common";
import { InsightsService } from "./insights.service";

@Controller("insights")
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get("actions")
  getActions(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getActions(clientId);
  }
}
