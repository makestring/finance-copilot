"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/");
        } else {
          setSuccessMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center">
        <span className="font-bold text-gray-900 tracking-tight">Finance Copilot</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}
            >
              💰
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {mode === "login"
                ? "Entre para acessar seu painel financeiro"
                : "Comece a controlar suas finanças hoje"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
              )}

              {successMsg && (
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{ backgroundColor: "#00c97a18", color: "#00a060" }}
                >
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                style={{ backgroundColor: "#00c97a" }}
              >
                {loading && <MiniSpinner />}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-gray-100 pt-5">
              <p className="text-sm text-gray-500">
                {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: "#00c97a" }}
                >
                  {mode === "login" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
