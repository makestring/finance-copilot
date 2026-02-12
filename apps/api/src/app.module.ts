import { Module } from "@nestjs/common";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SnapshotModule } from "./modules/snapshot/snapshot.module";

@Module({
  imports: [PrismaModule, OnboardingModule, SnapshotModule],
})
export class AppModule {}
