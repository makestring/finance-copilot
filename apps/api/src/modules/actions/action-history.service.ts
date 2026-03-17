import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class ActionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve o delegate real do Prisma (depende do nome do model no schema.prisma) */
  private get delegate(): any {
    const p: any = this.prisma as any;

    // Tente aqui os nomes mais prováveis.
    // Se no seu schema o model tiver outro nome, a gente ajusta a lista.
    const candidates = ["actionHistory", "actionEvent", "actionLog", "actionActionHistory"];

    for (const key of candidates) {
      if (p?.[key]?.create && p?.[key]?.findMany) return p[key];
    }

    throw new Error(
      `ActionHistory delegate not found in PrismaClient. Check your prisma/schema.prisma model name and add its camelCase delegate to candidates.`,
    );
  }

  // ✅ mantém o SEU jeito de chamar: log(clientId, type, payload)
  async log(clientId: string, type: string, payload: any = {}) {
    return this.delegate.create({
      data: {
        clientId,
        type,
        payload,
      },
    });
  }

  async list(clientId: string, limit = 20) {
    const items = await this.delegate.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { ok: true, items };
  }
}
