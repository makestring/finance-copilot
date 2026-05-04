"use client";

import { useEffect, useState } from "react";
import { api, type ProfileResponse } from "@/lib/api";
import { brl } from "@/lib/format";

type Expense = { id?: string; name: string; amountCents: number };
type LocalExpense = Expense & { _localId: string; amount: string };

type Props = {
  onSaved: () => void;
};

let _counter = 0;
function newLocalId() { return `local-${++_counter}`; }

function toLocal(e: Expense): LocalExpense {
  return { ...e, _localId: e.id ?? newLocalId(), amount: String(e.amountCents / 100) };
}

export function FixedExpensesCard({ onSaved }: Props) {
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(null);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.getProfile().then(({ profile: p }) => {
      setProfile(p);
      setMonthlyIncome(String(p.monthlyIncomeCents / 100));
      setExpenses(p.fixedExpenses.map(toLocal));
    }).catch((err) => setFetchError(err.message));
  }, []);

  function updateExpense(localId: string, field: "name" | "amount", value: string) {
    setExpenses((prev) => prev.map((e) => e._localId === localId ? { ...e, [field]: value } : e));
    setDirty(true);
    setSaveError(null);
  }

  function addExpense() {
    setExpenses((prev) => [...prev, { _localId: newLocalId(), name: "", amountCents: 0, amount: "" }]);
    setDirty(true);
  }

  function removeExpense(localId: string) {
    setExpenses((prev) => prev.filter((e) => e._localId !== localId));
    setDirty(true);
  }

  async function handleSave() {
    const incomeCents = Math.round(parseFloat(monthlyIncome.replace(",", ".")) * 100);
    if (isNaN(incomeCents) || incomeCents <= 0) return setSaveError("Renda mensal inválida.");

    for (const e of expenses) {
      if (!e.name.trim()) return setSaveError("Todos os gastos precisam ter um nome.");
      const cents = Math.round(parseFloat(e.amount.replace(",", ".")) * 100);
      if (isNaN(cents) || cents <= 0) return setSaveError(`Valor inválido para "${e.name}".`);
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
      setDirty(false);
      onSaved();
    } catch (err: any) {
      setSaveError(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-sm text-red-600">{fetchError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-3">
        <Spinner />
        <p className="text-sm text-gray-400">Carregando perfil…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h2 className="font-semibold text-gray-900">Gastos Fixos</h2>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Renda mensal (R$)</label>
        <input
          type="number"
          value={monthlyIncome}
          onChange={(e) => { setMonthlyIncome(e.target.value); setDirty(true); setSaveError(null); }}
          min="0.01"
          step="0.01"
          className="w-full sm:w-48 px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Despesas fixas</p>
        {expenses.length === 0 && (
          <p className="text-sm text-gray-400 py-2">Nenhuma despesa fixa cadastrada.</p>
        )}
        {expenses.map((e) => (
          <div key={e._localId} className="flex items-center gap-2">
            <input
              type="text"
              value={e.name}
              onChange={(ev) => updateExpense(e._localId, "name", ev.target.value)}
              placeholder="Nome (ex: Aluguel)"
              className="flex-1 px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
            />
            <input
              type="number"
              value={e.amount}
              onChange={(ev) => updateExpense(e._localId, "amount", ev.target.value)}
              placeholder="Valor"
              min="0.01"
              step="0.01"
              className="w-28 px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
            />
            <button
              onClick={() => removeExpense(e._localId)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title="Remover"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addExpense}
          className="text-xs font-semibold mt-1"
          style={{ color: "#00c97a" }}
        >
          + Adicionar despesa
        </button>
      </div>

      {saveError && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
      )}

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#00c97a" }}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin shrink-0">
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
