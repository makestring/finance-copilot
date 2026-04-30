import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: any) {
    const name = String(dto.name ?? "").trim();
    const amountCents = Number(dto.amountCents);
    const billingDay = Number(dto.billingDay);

    if (!name) throw new BadRequestException("name is required");
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException("amountCents must be > 0");
    }
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
      throw new BadRequestException("billingDay must be 1..31");
    }

    // garante Client
    await this.prisma.client.upsert({
      where: { id: clientId },
      update: {},
      create: { id: clientId },
    });

    const subscription = await this.prisma.subscription.create({
      data: { clientId, name, amountCents, billingDay },
    });

    return { ok: true, subscription };
  }

  async listWithSummary(clientId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { clientId },
      orderBy: [{ isActive: "desc" }, { amountCents: "desc" }, { name: "asc" }],
    });

    const active = subscriptions.filter((s) => s.isActive);
    const monthlyTotal = active.reduce((s, x) => s + x.amountCents, 0);

    return {
      ok: true,
      subscriptions,
      summary: {
        count: active.length,
        monthlyTotalCents: monthlyTotal,
        yearlyTotalCents: monthlyTotal * 12,
        top3: active.slice(0, 3).map((s) => ({ name: s.name, amountCents: s.amountCents })),
      },
    };
  }
}
