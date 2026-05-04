import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });
    if (!profile) throw new NotFoundException("Profile not found");
    return { ok: true, profile };
  }

  async upsertProfile(clientId: string, dto: any) {
    await this.prisma.client.upsert({
      where: { id: clientId },
      update: {},
      create: { id: clientId },
    });

    const profile = await this.prisma.financialProfile.upsert({
      where: { clientId },
      update: {
        monthlyIncomeCents: dto.monthlyIncomeCents,
        cardLimitCents: dto.cardLimitCents ?? null,
        cardDueDay: dto.cardDueDay ?? null,
        fixedExpenses: {
          deleteMany: {},
          create: (dto.fixedExpenses ?? []).map((e: any) => ({
            name: e.name,
            amountCents: e.amountCents,
          })),
        },
      },
      create: {
        clientId,
        monthlyIncomeCents: dto.monthlyIncomeCents,
        cardLimitCents: dto.cardLimitCents ?? null,
        cardDueDay: dto.cardDueDay ?? null,
        fixedExpenses: {
          create: (dto.fixedExpenses ?? []).map((e: any) => ({
            name: e.name,
            amountCents: e.amountCents,
          })),
        },
      },
      include: { fixedExpenses: true },
    });

    return { ok: true, profile };
  }
}
