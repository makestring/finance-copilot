"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ScoreCard } from "@/components/ScoreCard";

// ─── Types ──────────────────────────────────────────────────────────────────

type FixedExpense = { id: string; name: string; amount: string };
type Sub = { id: string; name: string; amount: string; billingDay: string };
type Step = 1 | 2 | 3 | 4;

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CHIPS = ["Aluguel", "Alimentação", "Transporte", "Academia", "Internet", "Energia", "Água", "Escola"];
const SUB_CHIPS = ["Netflix", "Spotify", "Amazon Prime", "Disney+", "YouTube Premium", "Apple TV+"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function parseCents(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);

  const [score, setScore] = useState<{ value: number; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Expense helpers ──────────────────────────────────────────────────────

  function addExpense(name = "") {
    setExpenses((prev) => [...prev, { id: uid(), name, amount: "" }]);
  }

  function updateExpense(id: string, field: "name" | "amount", value: string) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // ── Subscription helpers ──────────────────────────────────────────────────

  function addSub(name = "") {
    setSubs((prev) => [...prev, { id: uid(), name, amount: "", billingDay: "" }]);
  }

  function updateSub(id: string, field: keyof Omit<Sub, "id">, value: string) {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function removeSub(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const incomeValid = parseCents(income) > 0;

  const expensesValid = expenses.every(
    (e) => e.name.trim().length > 0 && parseCents(e.amount) > 0,
  );

  const subsValid = subs.every((s) => {
    const day = parseInt(s.billingDay);
    return s.name.trim().length > 0 && parseCents(s.amount) > 0 && day >= 1 && day <= 31;
  });

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.postOnboardingProfile({
        monthlyIncomeCents: parseCents(income),
        fixedExpenses: expenses
          .filter((e) => e.name.trim() && parseCents(e.amount) > 0)
          .map((e) => ({ name: e.name.trim(), amountCents: parseCents(e.amount) })),
      });

      if (subs.length > 0) {
        await Promise.all(
          subs
            .filter((s) => s.name.trim() && parseCents(s.amount) > 0 && parseInt(s.billingDay) >= 1)
            .map((s) =>
              api.createSubscription({
                name: s.name.trim(),
                amountCents: parseCents(s.amount),
                billingDay: parseInt(s.billingDay),
              }),
            ),
        );
      }

      const result = await api.getScore();
      setScore({ value: result.score.value, label: result.score.level });
      setStep(4);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center">
        <span className="font-bold text-gray-900 tracking-tight">Finance Copilot</span>
      </header>

      <main className="px-4 py-10">
        <div className="max-w-lg mx-auto space-y-6">
          {step < 4 && <StepIndicator current={step} total={3} />}

          {step === 1 && (
            <StepIncome
              income={income}
              onChange={setIncome}
              onNext={() => setStep(2)}
              canNext={incomeValid}
            />
          )}

          {step === 2 && (
            <StepExpenses
              expenses={expenses}
              onAdd={addExpense}
              onUpdate={updateExpense}
              onRemove={removeExpense}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              canNext={expensesValid}
            />
          )}

          {step === 3 && (
            <StepSubscriptions
              subs={subs}
              onAdd={addSub}
              onUpdate={updateSub}
              onRemove={removeSub}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitError={submitError}
              canSubmit={subsValid}
            />
          )}

          {step === 4 && score && (
            <StepResult score={score} onDashboard={() => router.push("/")} />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 pb-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <Fragment key={n}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
            style={{
              backgroundColor: n <= current ? "#00c97a" : "#e5e7eb",
              color: n <= current ? "white" : "#9ca3af",
            }}
          >
            {n < current ? "✓" : n}
          </div>
          {n < total && (
            <div
              className="h-0.5 w-10 rounded-full transition-all"
              style={{ backgroundColor: n < current ? "#00c97a" : "#e5e7eb" }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">{children}</div>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

function AmountInput({
  value,
  onChange,
  placeholder = "0,00",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
        R$
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
      />
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
  className = "",
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`py-3 px-6 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      style={{ backgroundColor: "#00c97a" }}
    >
      {loading && <MiniSpinner />}
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="py-3 px-6 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {children}
    </button>
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

function Chips({ items, onSelect }: { items: string[]; onSelect: (name: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
        >
          + {item}
        </button>
      ))}
    </div>
  );
}

// ─── Step 1: Income ───────────────────────────────────────────────────────────

function StepIncome({
  income,
  onChange,
  onNext,
  canNext,
}: {
  income: string;
  onChange: (v: string) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <Card>
      <StepLabel>Etapa 1 de 3 · Renda mensal</StepLabel>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Quanto você ganha por mês?</h2>
      <p className="text-sm text-gray-400 mb-8">
        Informe o valor líquido que você recebe todo mês.
      </p>

      <AmountInput
        value={income}
        onChange={onChange}
        placeholder="5.000,00"
        className="mb-8"
      />

      <PrimaryButton onClick={onNext} disabled={!canNext} className="w-full">
        Próximo →
      </PrimaryButton>
    </Card>
  );
}

// ─── Step 2: Fixed Expenses ───────────────────────────────────────────────────

function StepExpenses({
  expenses,
  onAdd,
  onUpdate,
  onRemove,
  onBack,
  onNext,
  canNext,
}: {
  expenses: FixedExpense[];
  onAdd: (name?: string) => void;
  onUpdate: (id: string, field: "name" | "amount", value: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <Card>
      <StepLabel>Etapa 2 de 3 · Gastos fixos</StepLabel>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Quais são seus gastos fixos?</h2>
      <p className="text-sm text-gray-400">
        Adicione despesas que se repetem todo mês. Você pode pular essa etapa.
      </p>

      <Chips items={EXPENSE_CHIPS} onSelect={(name) => onAdd(name)} />

      {expenses.length > 0 && (
        <ul className="mt-5 space-y-3">
          {expenses.map((exp) => (
            <li key={exp.id} className="flex items-center gap-2">
              <input
                type="text"
                value={exp.name}
                onChange={(e) => onUpdate(exp.id, "name", e.target.value)}
                placeholder="Nome do gasto"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
              />
              <AmountInput
                value={exp.amount}
                onChange={(v) => onUpdate(exp.id, "amount", v)}
                className="w-36"
              />
              <button
                onClick={() => onRemove(exp.id)}
                className="text-gray-300 hover:text-red-400 transition-colors p-1 text-xl leading-none shrink-0"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onAdd()}
        className="mt-4 text-sm font-semibold flex items-center gap-1 transition-colors"
        style={{ color: "#00c97a" }}
      >
        + Adicionar gasto
      </button>

      <div className="flex gap-3 mt-8">
        <SecondaryButton onClick={onBack}>← Voltar</SecondaryButton>
        <PrimaryButton onClick={onNext} disabled={!canNext} className="flex-1">
          Próximo →
        </PrimaryButton>
      </div>
    </Card>
  );
}

// ─── Step 3: Subscriptions ────────────────────────────────────────────────────

function StepSubscriptions({
  subs,
  onAdd,
  onUpdate,
  onRemove,
  onBack,
  onSubmit,
  submitting,
  submitError,
  canSubmit,
}: {
  subs: Sub[];
  onAdd: (name?: string) => void;
  onUpdate: (id: string, field: keyof Omit<Sub, "id">, value: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  canSubmit: boolean;
}) {
  return (
    <Card>
      <StepLabel>Etapa 3 de 3 · Assinaturas</StepLabel>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Tem assinaturas recorrentes?</h2>
      <p className="text-sm text-gray-400">
        Opcional. Serviços de streaming, clubes, apps pagos, etc.
      </p>

      <Chips items={SUB_CHIPS} onSelect={(name) => onAdd(name)} />

      {subs.length > 0 && (
        <>
          <ul className="mt-5 space-y-3">
            {subs.map((sub) => (
              <li key={sub.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => onUpdate(sub.id, "name", e.target.value)}
                  placeholder="Nome"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
                />
                <AmountInput
                  value={sub.amount}
                  onChange={(v) => onUpdate(sub.id, "amount", v)}
                  className="w-28"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={sub.billingDay}
                  onChange={(e) => onUpdate(sub.id, "billingDay", e.target.value)}
                  placeholder="Dia"
                  title="Dia de vencimento (1-31)"
                  className="w-16 px-3 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors text-center"
                />
                <button
                  onClick={() => onRemove(sub.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 text-xl leading-none shrink-0"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-2 ml-1">
            O campo "Dia" é o dia de vencimento da cobrança (1–31).
          </p>
        </>
      )}

      <button
        onClick={() => onAdd()}
        className="mt-4 text-sm font-semibold flex items-center gap-1 transition-colors"
        style={{ color: "#00c97a" }}
      >
        + Adicionar assinatura
      </button>

      {submitError && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-600 text-sm">{submitError}</div>
      )}

      <div className="flex gap-3 mt-8">
        <SecondaryButton onClick={onBack}>← Voltar</SecondaryButton>
        <PrimaryButton
          onClick={onSubmit}
          disabled={!canSubmit}
          loading={submitting}
          className="flex-1"
        >
          {submitting ? "Calculando…" : "Calcular meu score →"}
        </PrimaryButton>
      </div>
    </Card>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────

function StepResult({
  score,
  onDashboard,
}: {
  score: { value: number; label: string };
  onDashboard: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center pt-2">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
          style={{ backgroundColor: "#00c97a20" }}
        >
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Perfil criado com sucesso!</h2>
        <p className="text-sm text-gray-400 mt-1">
          Aqui está o seu score financeiro inicial.
        </p>
      </div>

      <ScoreCard value={score.value} label={score.label} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          Seu score reflete a saúde financeira com base na sua renda, gastos fixos e assinaturas.
          Cancele o que não usa para melhorá-lo ao longo do tempo.
        </p>
      </div>

      <PrimaryButton onClick={onDashboard} className="w-full">
        Ver meu dashboard →
      </PrimaryButton>
    </div>
  );
}
