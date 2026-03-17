import { Body, Controller, Get, Headers, Put, BadRequestException } from "@nestjs/common";
import { SettingsService } from "./settings.service";

type UpdateSettingsDto = {
  subscriptionsThresholdPct?: number; // 1..100
  upcomingBillingWindowDays?: number; // 0..31
};

@Controller("settings")
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  async get(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getOrCreate(clientId);
  }

  @Put()
  async update(
    @Headers("x-client-id") clientId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.update(clientId, dto);
  }
}
