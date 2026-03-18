import { BadRequestException, Controller, Get, Headers } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("overview")
  overview(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getOverview(clientId);
  }
}