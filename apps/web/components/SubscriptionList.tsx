import { brl } from "@/lib/format";
import type { Subscription } from "@/lib/api";

type Props = {
  active: Subscription[];
  cancelled: Subscription[];
  cancelling: string | null;
  onCancel: (sub: Subscription) => void;
  loading: boolean;
};

export function SubscriptionList({ active, cancelled, cancelling, onCancel, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Assinaturas</h2>
        {loading && (
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Spinner size={12} />
            Atualizando
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">💸</p>
          <p className="text-sm text-gray-400 font-medium">Nenhuma assinatura ativa no momento.</p>
          <p className="text-xs text-gray-300 mt-1">
            Quando você adicionar assinaturas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
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
      )}

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
