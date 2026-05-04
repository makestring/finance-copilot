"use client";

import { useState } from "react";

const RADIUS = 44;
const STROKE = 9;
const SIZE = 110;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(v: number) {
  if (v >= 70) return "#00c97a";
  if (v >= 40) return "#f5a623";
  return "#e53e3e";
}

type Props = { value: number; label: string };

export function ScoreCard({ value, label }: Props) {
  const [open, setOpen] = useState(false);
  const clamped = Math.min(100, Math.max(0, value));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 relative">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={STROKE}
          />
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ transition: "stroke-dashoffset 0.7s ease" }}
          />
          <text
            x={CENTER} y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: 22, fontWeight: 700, fill: color, fontFamily: "inherit" }}
          >
            {value}
          </text>
        </svg>

        <div className="flex-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">
            Score financeiro
          </p>
          <p className="text-lg font-semibold text-gray-800 leading-snug">{label}</p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200 hover:border-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Como o score é calculado"
        >
          ?
        </button>
      </div>

      {open && <ScoreInfoModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ScoreInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-bold text-gray-900 text-base leading-snug">
            Como o score é calculado?
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">
          Seu score vai de 0 a 100 e mede sua saúde financeira com base em 3 fatores:
        </p>

        <ul className="space-y-4">
          {FACTORS.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="text-xl shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div
          className="rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed"
          style={{ backgroundColor: "#00c97a0d", borderLeft: "3px solid #00c97a" }}
        >
          <span className="font-semibold">💡 Dica:</span> cancelar assinaturas desnecessárias é a ação com maior impacto no seu score.
        </div>
      </div>
    </div>
  );
}

const FACTORS = [
  {
    icon: "📊",
    title: "Proporção de gastos fixos",
    description:
      "Quanto dos seus ganhos vai para despesas fixas como aluguel e alimentação. Quanto menor essa proporção, melhor.",
  },
  {
    icon: "📱",
    title: "Peso das assinaturas",
    description:
      "O total das suas assinaturas em relação ao seu saldo disponível. Assinaturas acima de 10% do saldo reduzem o score.",
  },
  {
    icon: "📅",
    title: "Cobranças próximas",
    description:
      "Assinaturas com vencimento nos próximos 5 dias geram um alerta que impacta levemente o score.",
  },
];
