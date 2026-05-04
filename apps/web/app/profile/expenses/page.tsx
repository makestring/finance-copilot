"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type LocalExpense = { _id: string; name: string; amount: string };

let _seq = 0;
function uid() { return `e-${++_seq}`; }

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function FixedExpensesPage() {
  const router = useRouter();

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(({ profile }) => {
        setMonthlyIncome(centsToAmount(profile.monthlyIncomeCents));
        setExpenses(
          profile.fixedExpenses.map((e) => ({
            _id: e.id,
            name: e.name,
            amount: centsToAmount(e.amountCents),
          })),
        );
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateExpense(id: string, field: "name" | "amount", value: string) {
    setExpenses((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
    setSaveError(null);
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e._id !== id));
    setSaveError(null);
  }

  function addExpense() {
    setExpenses((prev) => [...prev, { _id: uid(), name: "", amount: "" }]);
  }

  async function handleSave() {
    const incomeCents = Math.round(parseFloat(monthlyIncome.replace(",", ".")) * 100);
    if (isNaN(incomeCents) || incomeCents <= 0) {
      return setSaveError("Renda mensal inválida.");
    }

    for (const e of expenses) {
      if (!e.name.trim()) return setSaveError("Todos os gastos precisam ter um nome.");
      const c = Math.round(parseFloat(e.amount.replace(",", ".")) * 100);
      if (isNaN(c) || c <= 0) return setSaveError(`Valor inválido para "${e.name}".`);
    }

    setSaving(true);
    setSaveError(null);
    try {
      await api.postOnboardingProfile({
        monthlyIncomeCents: incomeCents,
        fixedExpenses: expenses.map((e) => ({
          name: e.name.trim(),
          amountCents: Math.round(parseFloat(e.amount.replace(",", ".")) * 100),
        })),
      });
      router.push("/");
    } catch (err: any) {
      setSaveError(err.message ?? "Erro ao salvar alterações.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-100 px-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar
        </button>
        <span className="font-semibold text-gray-900">Gastos Fixos</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner large />
          </div>
        ) : fetchError ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-3">
            <p className="text-4xl">⚠️</p>
            <p className="text-sm text-red-600">{fetchError}</p>
            <button
              onClick={() => router.push("/")}
              className="text-sm px-5 py-2 rounded-xl bg-gray-900 text-white hover:opacity-80 transition-opacity"
            >
              Voltar ao dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Income */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
              <h2 className="font-semibold text-gray-900">Renda mensal</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 shrink-0">R$</span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => { setMonthlyIncome(e.target.value); setSaveError(null); }}
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
                />
              </div>
            </div>

            {/* Fixed expenses */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Despesas fixas</h2>
                <span className="text-xs text-gray-400">{expenses.length} {expenses.length === 1 ? "despesa" : "despesas"}</span>
              </div>

              {expenses.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Nenhuma despesa fixa cadastrada.
                </p>
              ) : (
                <ul className="space-y-3">
                  {expenses.map((e) => (
                    <li key={e._id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={e.name}
                        onChange={(ev) => updateExpense(e._id, "name", ev.target.value)}
                        placeholder="Nome (ex: Aluguel)"
                        className="flex-1 px-3 py-2.5 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors min-w-0"
                      />
                      <div className="flex items-center gap-1 border border-[#d1d5db] rounded-lg focus-within:border-[#00c97a] transition-colors bg-white px-2 shrink-0">
                        <span className="text-xs text-gray-400">R$</span>
                        <input
                          type="number"
                          value={e.amount}
                          onChange={(ev) => updateExpense(e._id, "amount", ev.target.value)}
                          placeholder="0,00"
                          min="0.01"
                          step="0.01"
                          className="w-24 py-2.5 bg-transparent text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeExpense(e._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Remover"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={addExpense}
                className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: "#00c97a" }}
              >
                <span className="text-lg leading-none">+</span> Adicionar despesa
              </button>
            </div>

            {saveError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {saveError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: "#00c97a" }}
              >
                {saving && <Spinner />}
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Spinner({ large }: { large?: boolean }) {
  const size = large ? 40 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#00c97a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
