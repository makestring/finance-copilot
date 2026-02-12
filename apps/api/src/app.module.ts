import { Module } from "@nestjs/common";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SnapshotModule } from "./modules/snapshot/snapshot.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { LeaksModule } from "./modules/leaks/leaks.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { ScoreModule } from "./modules/score/score.module";




@Module({
  imports: [PrismaModule, OnboardingModule, SnapshotModule, SubscriptionsModule, LeaksModule, SettingsModule, ScoreModule],
})
export class AppModule {}
