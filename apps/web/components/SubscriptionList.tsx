"use client";

import { useState } from "react";
import { brl } from "@/lib/format";
import type { Subscription } from "@/lib/api";

type Props = {
  active: Subscription[];
  cancelled: Subscription[];
  cancelling: string | null;
  onCancel: (sub: Subscription) => void;
  onAddSubscription: (data: { name: string; amountCents: number; billingDay: number }) => Promise<void>;
  loading: boolean;
};

const EMPTY_FORM = { name: "", amount: "", billingDay: "1" };

export function SubscriptionList({
  active,
  cancelled,
  cancelling,
  onCancel,
  onAddSubscription,
  loading,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    const billingDay = parseInt(form.billingDay, 10);
    if (!form.name.trim()) return setFormError("Informe o nome da assinatura.");
    if (isNaN(amountCents) || amountCents <= 0) return setFormError("Valor inválido.");
    if (isNaN(billingDay) || billingDay < 1 || billingDay > 28) return setFormError("Dia de vencimento deve ser entre 1 e 28.");

    setSaving(true);
    setFormError(null);
    try {
      await onAddSubscription({ name: form.name.trim(), amountCents, billingDay });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao adicionar assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Assinaturas</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Spinner size={12} />
              Atualizando
            </span>
          )}
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(null); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={showForm
              ? { backgroundColor: "#f3f4f6", color: "#6b7280" }
              : { backgroundColor: "#00c97a15", color: "#00c97a" }}
          >
            {showForm ? "Cancelar" : "+ Adicionar"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nova assinatura</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="Ex: Netflix"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Valor (R$)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => handleField("amount", e.target.value)}
                placeholder="39,90"
                min="0.01"
                step="0.01"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Dia de vencimento</label>
              <input
                type="number"
                value={form.billingDay}
                onChange={(e) => handleField("billingDay", e.target.value)}
                min="1"
                max="28"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#d1d5db] bg-white text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] outline-none focus:border-[#00c97a] transition-colors"
              />
            </div>
          </div>
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#00c97a" }}
          >
            {saving ? "Salvando…" : "Adicionar assinatura"}
          </button>
        </form>
      )}

      {active.length === 0 && !showForm ? (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">💸</p>
          <p className="text-sm text-gray-400 font-medium">Nenhuma assinatura ativa no momento.</p>
          <p className="text-xs text-gray-300 mt-1">
            Quando você adicionar assinaturas, elas aparecerão aqui.
          </p>
        </div>
      ) : active.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {active.map((sub) => (
            <li key={sub.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Avatar name={sub.name} bgColor="#00c97a" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{sub.name}</p>
                  <p className="text-xs text-gray-400">
                    {brl(sub.amountCents)}/mês · vence dia {sub.billingDay}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onCancel(sub)}
                disabled={cancelling === sub.id}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancelling === sub.id ? "Cancelando…" : "Cancelar"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {cancelled.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Canceladas
          </p>
          <ul className="divide-y divide-gray-50 opacity-50">
            {cancelled.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar name={sub.name} bgColor="#d1d5db" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 line-through">{sub.name}</p>
                    <p className="text-xs text-gray-400">{brl(sub.amountCents)}/mês</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                  Cancelada
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, bgColor }: { name: string; bgColor: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="#9ca3af"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
