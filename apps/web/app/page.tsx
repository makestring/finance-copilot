"use client";

import { useEffect, useRef, useState } from "react";
import { api, type DashboardOverview, type Subscription } from "../lib/api";

function brl(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

type Toast = { message: string; ok: boolean };

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  function showToast(message: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [dash, subs] = await Promise.all([api.getDashboard(), api.getSubscriptions()]);
      setDashboard(dash);
      setSubscriptions(subs.subscriptions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(sub: Subscription) {
    setCancelling(sub.id);
    try {
      const result = await api.cancelSubscription(sub.id);
      showToast(result.toast, true);
      await loadAll();
    } catch (err: any) {
      showToast(`Erro ao cancelar: ${err.message}`, false);
    } finally {
      setCancelling(null);
    }
  }

  async function handleTopAction() {
    const action = dashboard?.topAction?.action;
    if (!action) return;

    if (action.kind === "navigate") {
      showToast(`Navegar para: ${action.screen}`, true);
      return;
    }

    if (action.kind === "api" && action.path) {
      try {
        const result = await api["cancelSubscription"](
          action.path.replace("/subscriptions/", "").replace("/confirm-cancel", ""),
        );
        showToast(result.toast, true);
        await loadAll();
      } catch (err: any) {
        showToast(`Erro ao executar ação: ${err.message}`, false);
      }
    }
  }

  if (error) {
    return <div className="p-10 text-red-600">Erro: {error}</div>;
  }

  if (loading && !dashboard) {
    return <div className="p-10 text-gray-500">Carregando...</div>;
  }

  const active = subscriptions.filter((s) => s.isActive);
  const cancelled = subscriptions.filter((s) => !s.isActive);

  return (
    <div className="p-10 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Finance Copilot</h1>

      {dashboard && (
        <>
          <div className="bg-green-100 p-6 rounded-xl shadow">
            <h2 className="text-lg text-gray-600">{dashboard.ui.hero.title}</h2>
            <p className="text-3xl font-bold">{dashboard.ui.hero.headline}</p>
            <p className="text-gray-500">{dashboard.ui.hero.subtitle}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <p className="text-gray-500">Score</p>
            <p className="text-3xl font-bold">{dashboard.score.value}</p>
            <p className="text-gray-500">{dashboard.score.label}</p>
          </div>

          <div className="bg-blue-100 p-6 rounded-xl shadow">
            <p className="text-gray-600">{dashboard.ui.highlightCard.title}</p>
            <p className="text-2xl font-bold">{dashboard.ui.highlightCard.value}</p>
            <p className="text-gray-500">{dashboard.ui.highlightCard.subtitle}</p>
          </div>

          {dashboard.topAction && (
            <div className="bg-white p-6 rounded-xl shadow border">
              <p className="text-gray-500 mb-2">Próxima melhor ação</p>
              <p className="text-2xl font-bold">{dashboard.topAction.label}</p>

              {dashboard.topAction.impactLabel && (
                <p className="text-green-700 mt-2">{dashboard.topAction.impactLabel}</p>
              )}

              {dashboard.topAction.monthlySavingsFormatted && (
                <p className="text-gray-600 mt-1">
                  Economia: {dashboard.topAction.monthlySavingsFormatted}/mês
                </p>
              )}

              {dashboard.topAction.performance && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>Taxa de sucesso: {dashboard.topAction.performance.successRate}%</p>
                  <p>Resultado já comprovado: {dashboard.topAction.performance.actualSavingsFormatted}</p>
                </div>
              )}

              <button
                onClick={handleTopAction}
                className="mt-4 px-4 py-2 rounded-lg bg-black text-white"
              >
                {dashboard.topAction.ctaLabel}
              </button>
            </div>
          )}
        </>
      )}

      <div className="bg-white p-6 rounded-xl shadow border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assinaturas ativas</h2>
          {loading && <span className="text-sm text-gray-400">Atualizando...</span>}
        </div>

        {active.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma assinatura ativa.</p>
        ) : (
          <ul className="space-y-3">
            {active.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{sub.name}</p>
                  <p className="text-sm text-gray-500">
                    {brl(sub.amountCents)}/mês · vence dia {sub.billingDay}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(sub)}
                  disabled={cancelling === sub.id}
                  className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling === sub.id ? "Cancelando..." : "Cancelar"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {cancelled.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Canceladas
            </h3>
            <ul className="space-y-2">
              {cancelled.map((sub) => (
                <li key={sub.id} className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="font-medium line-through">{sub.name}</p>
                    <p className="text-sm text-gray-400">
                      {brl(sub.amountCents)}/mês · era dia {sub.billingDay}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                    Cancelada
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 max-w-sm px-5 py-3 rounded-xl shadow-lg text-white text-sm transition-all ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
