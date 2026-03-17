import { Module } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { ScoreController } from "./score.controller";
import { PrismaModule } from "../../shared/infrastructure/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ScoreController],
  providers: [ScoreService],
  exports: [ScoreService], // ✅ ADICIONE ESTA LINHA
})
export class ScoreModule {}
