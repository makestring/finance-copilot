import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from "@nestjs/common";
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

  @Get("unread-count")
  unreadCount(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.unreadCount(clientId);
  }

  @Post("recompute")
  recompute(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.recompute(clientId);
  }

  @Post(":id/read")
  markRead(
    @Headers("x-client-id") clientId: string,
    @Param("id") id: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.markRead(clientId, id);
  }

  @Post(":id/dismiss")
  dismiss(
    @Headers("x-client-id") clientId: string,
    @Param("id") id: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.dismiss(clientId, id);
  }
}