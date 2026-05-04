"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";

export function FixedExpensesSummaryCard() {
  const router = useRouter();
  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(({ profile }) => {
        const total = profile.fixedExpenses.reduce((s, e) => s + e.amountCents, 0);
        setTotalCents(total);
        setCount(profile.fixedExpenses.length);
      })
      .catch(() => {
        setTotalCents(0);
        setCount(0);
      });
  }, []);

  const loaded = totalCents !== null && count !== null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Gastos fixos
          </p>
          {loaded ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{brl(totalCents!)}</p>
              <p className="text-xs text-gray-400">
                {count === 0
                  ? "Nenhum gasto cadastrado"
                  : `${count} ${count === 1 ? "despesa" : "despesas"} por mês`}
              </p>
            </>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="h-7 w-28 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/profile/expenses")}
          className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: "#d1d5db", color: "#374151" }}
        >
          Editar
        </button>
      </div>
    </div>
  );
}
