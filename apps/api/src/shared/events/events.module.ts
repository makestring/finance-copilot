import { Module } from "@nestjs/common";
import { ConsoleEventBus } from "./event-bus";

@Module({
  providers: [
    {
      provide: "EVENT_BUS",
      useClass: ConsoleEventBus,
    },
  ],
  exports: ["EVENT_BUS"],
})
export class EventsModule {}
