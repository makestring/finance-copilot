import { Module } from "@nestjs/common";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SnapshotModule } from "./modules/snapshot/snapshot.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { LeaksModule } from "./modules/leaks/leaks.module";


@Module({
  imports: [PrismaModule, OnboardingModule, SnapshotModule, SubscriptionsModule, LeaksModule],
})
export class AppModule {}
