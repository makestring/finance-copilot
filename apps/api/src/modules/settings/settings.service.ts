import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(clientId: string) {
    await this.prisma.client.upsert({
      where: { id: clientId },
      update: {},
      create: { id: clientId },
    });

    const settings = await this.prisma.userSettings.upsert({
      where: { clientId },
      update: {},
      create: { clientId },
    });

    return { ok: true, settings };
  }

  async update(clientId: string, dto: any) {
    // validações simples (MVP)
    if (dto.subscriptionsThresholdPct !== undefined) {
      const v = Number(dto.subscriptionsThresholdPct);
      if (!Number.isFinite(v) || v < 1 || v > 100) {
        throw new BadRequestException("subscriptionsThresholdPct must be between 1 and 100");
      }
    }

    if (dto.upcomingBillingWindowDays !== undefined) {
      const v = Number(dto.upcomingBillingWindowDays);
      if (!Number.isFinite(v) || v < 0 || v > 31) {
        throw new BadRequestException("upcomingBillingWindowDays must be between 0 and 31");
      }
    }

    await this.prisma.client.upsert({
      where: { id: clientId },
      update: {},
      create: { id: clientId },
    });

    const settings = await this.prisma.userSettings.upsert({
      where: { clientId },
      update: {
        ...(dto.subscriptionsThresholdPct !== undefined
          ? { subscriptionsThresholdPct: Number(dto.subscriptionsThresholdPct) }
          : {}),
        ...(dto.upcomingBillingWindowDays !== undefined
          ? { upcomingBillingWindowDays: Number(dto.upcomingBillingWindowDays) }
          : {}),
      },
      create: {
        clientId,
        subscriptionsThresholdPct:
          dto.subscriptionsThresholdPct !== undefined ? Number(dto.subscriptionsThresholdPct) : 10,
        upcomingBillingWindowDays:
          dto.upcomingBillingWindowDays !== undefined ? Number(dto.upcomingBillingWindowDays) : 5,
      },
    });

    return { ok: true, settings };
  }
}
