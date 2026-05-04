import { Body, Controller, Get, Headers, Post, BadRequestException } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";

type FixedExpenseDto = { name: string; amountCents: number };

type CreateProfileDto = {
  monthlyIncomeCents: number;
  cardLimitCents?: number;
  cardDueDay?: number;
  fixedExpenses: FixedExpenseDto[];
};

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get("profile")
  async getProfile(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.getProfile(clientId);
  }

  @Post("profile")
  async upsertProfile(
    @Headers("x-client-id") clientId: string,
    @Body() dto: CreateProfileDto,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.upsertProfile(clientId, dto);
  }
}
