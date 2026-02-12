import { Controller, Get, Headers, BadRequestException } from "@nestjs/common";
import { LeaksService } from "./leaks.service";

@Controller("leaks")
export class LeaksController {
  constructor(private readonly service: LeaksService) {}

  @Get("summary")
  async summary(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getSummary(clientId);
  }
}
