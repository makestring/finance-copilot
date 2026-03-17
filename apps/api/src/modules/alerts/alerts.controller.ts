import { BadRequestException, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { AlertsService } from "./alerts.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  list(
    @Headers("x-client-id") clientId: string,
    @Query("limit") limit?: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.list(clientId, limit ? Number(limit) : 20);
  }

  @Post("recompute")
  recompute(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.recompute(clientId);
  }
}