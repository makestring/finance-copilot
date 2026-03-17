import { BadRequestException, Controller, Get, Headers, Query } from "@nestjs/common";
import { ActionHistoryService } from "./action-history.service";

@Controller("actions")
export class ActionHistoryController {
  constructor(private readonly history: ActionHistoryService) {}

  @Get("history")
  getHistory(
    @Headers("x-client-id") clientId: string,
    @Query("limit") limit?: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.history.list(clientId, limit ? Number(limit) : 20);
  }
}
