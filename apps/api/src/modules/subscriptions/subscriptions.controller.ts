import { Body, Controller, Get, Headers, Post, BadRequestException } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";

type CreateSubscriptionDto = {
  name: string;
  amountCents: number;
  billingDay: number;
};

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  async create(@Headers("x-client-id") clientId: string, @Body() dto: CreateSubscriptionDto) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.create(clientId, dto);
  }

  @Get()
  async list(@Headers("x-client-id") clientId: string) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.listWithSummary(clientId);
  }
}
