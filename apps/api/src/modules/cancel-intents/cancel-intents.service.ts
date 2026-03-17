import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class CancelIntentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, subscriptionId: string, reason?: string) {
    // valida se a assinatura pertence ao cliente
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, clientId },
    });

    if (!sub) {
      throw new NotFoundException("Subscription not found for this client.");
    }

    const intent = await this.prisma.cancelIntent.create({
      data: {
        reason,
        client: { connect: { id: clientId } },
        subscription: { connect: { id: subscriptionId } },
      },
    });

    return { ok: true, intent };
  }

  async list(clientId: string) {
    const items = await this.prisma.cancelIntent.findMany({
      where: { clientId },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, items };
  }
}
