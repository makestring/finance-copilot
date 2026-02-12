import { Controller, Get, Headers, BadRequestException } from "@nestjs/common";
import { SnapshotService } from "./snapshot.service";

@Controller("snapshot")
export class SnapshotController {
  constructor(private readonly service: SnapshotService) {}

  @Get("monthly")
  async getMonthly(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getMonthlySnapshot(clientId);
  }
}
