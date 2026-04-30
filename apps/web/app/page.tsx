"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DashboardOverview, type Subscription } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { HeroCard } from "@/components/HeroCard";
import { ScoreCard } from "@/components/ScoreCard";
import { HighlightCard } from "@/components/HighlightCard";
import { TopActionCard } from "@/components/TopActionCard";
import { SubscriptionList } from "@/components/SubscriptionList";

type Toast = { message: string; ok: boolean };

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
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
      if (err.message?.startsWith("HTTP 404")) {
        router.push("/onboarding");
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
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
        const result = await api.cancelSubscription(
          action.path.replace("/subscriptions/", "").replace("/confirm-cancel", ""),
        );
        showToast(result.toast, true);
        await loadAll();
      } catch (err: any) {
        showToast(`Erro ao executar ação: ${err.message}`, false);
      }
    }
  }

  const alertCount = dashboard?.alertsSummary?.unread ?? 0;
  const active = subscriptions.filter((s) => s.isActive);
  const cancelled = subscriptions.filter((s) => !s.isActive);

  return (
    <>
      {/* Fixed header */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between">
        <span className="font-bold text-gray-900 tracking-tight">Finance Copilot</span>
        <div className="flex items-center gap-4">
          {alertCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Alertas</span>
              <span
                className="text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#e53e3e" }}
              >
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            </div>
          )}
          {userEmail && (
            <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="pt-14 min-h-screen bg-gray-50">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[80vh] gap-3 text-center px-6">
            <p className="text-5xl">⚠️</p>
            <p className="text-gray-600 text-sm max-w-xs">{error}</p>
            <button
              onClick={loadAll}
              className="text-sm px-5 py-2 rounded-xl bg-gray-900 text-white mt-2 hover:opacity-80 transition-opacity"
            >
              Tentar novamente
            </button>
          </div>
        ) : loading && !dashboard ? (
          <div className="flex items-center justify-center h-[80vh]">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {dashboard && (
              <>
                <HeroCard {...dashboard.ui.hero} />
                <ScoreCard value={dashboard.score.value} label={dashboard.score.label} />
                <HighlightCard {...dashboard.ui.highlightCard} />
                {dashboard.topAction && (
                  <TopActionCard topAction={dashboard.topAction} onAction={handleTopAction} />
                )}
              </>
            )}

            <SubscriptionList
              active={active}
              cancelled={cancelled}
              cancelling={cancelling}
              onCancel={handleCancel}
              loading={loading && !!dashboard}
            />
          </div>
        )}
      </main>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm px-5 py-3 rounded-xl shadow-lg text-white text-sm"
          style={{ backgroundColor: toast.ok ? "#00c97a" : "#e53e3e" }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="44" height="44" viewBox="0 0 44 44" className="animate-spin">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <path
          d="M22 4a18 18 0 0 1 18 18"
          fill="none"
          stroke="#00c97a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-sm text-gray-400">Carregando seu painel…</p>
    </div>
  );
}
