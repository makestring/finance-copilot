import { BadRequestException, Controller, Param, Post, Headers } from "@nestjs/common";
import { ActionsService } from "./actions.service";

@Controller()
export class ActionsController {
  constructor(private readonly service: ActionsService) {}

  @Post("subscriptions/:id/confirm-cancel")
  confirmCancel(
    @Param("id") subscriptionId: string,
    @Headers("x-client-id") clientId: string,
  ) {
    if (!clientId) throw new BadRequestException("Missing x-client-id header");
    return this.service.confirmCancelSubscription(clientId, subscriptionId);
  }
}
