import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlySnapshot(clientId: string) {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { clientId },
      include: { fixedExpenses: true },
    });

    if (!profile) throw new NotFoundException("Profile not found. POST /onboarding/profile first.");

    const income = profile.monthlyIncomeCents;
    const fixedTotal = profile.fixedExpenses.reduce((sum, e) => sum + e.amountCents, 0);
    const saldoReal = income - fixedTotal;

    const ratio = income > 0 ? saldoReal / income : 0;

    let risk: "GREEN" | "YELLOW" | "RED" = "RED";
    if (ratio >= 0.2) risk = "GREEN";
    else if (ratio >= 0.05) risk = "YELLOW";

    return {
      ok: true,
      snapshot: {
        monthlyIncomeCents: income,
        fixedExpensesCents: fixedTotal,
        saldoRealCents: saldoReal,
        risk,
        drivers: [
          { key: "fixed_expenses", label: "Gastos fixos", amountCents: fixedTotal },
          { key: "free_cash", label: "Saldo real estimado", amountCents: saldoReal },
        ],
      },
    };
  }
}
