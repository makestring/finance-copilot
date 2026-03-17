import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { CancelIntentsService } from "./cancel-intents.service";

@Controller("cancel-intents")
export class CancelIntentsController {
  constructor(private readonly service: CancelIntentsService) {}

  @Post()
  create(
    @Headers("x-client-id") clientId: string,
    @Body() body: { subscriptionId: string; reason?: string },
  ) {
    return this.service.create(clientId, body.subscriptionId, body.reason);
  }

  @Get()
  list(@Headers("x-client-id") clientId: string) {
    return this.service.list(clientId);
  }
}
