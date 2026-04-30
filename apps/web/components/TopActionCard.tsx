import type { DashboardOverview } from "@/lib/api";

type TopAction = NonNullable<DashboardOverview["topAction"]>;

type Props = {
  topAction: TopAction;
  onAction: () => void;
};

export function TopActionCard({ topAction, onAction }: Props) {
  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 border-l-4"
      style={{ borderLeftColor: "#00c97a" }}
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Próxima melhor ação
      </p>
      <p className="text-xl font-bold text-gray-900 leading-snug">{topAction.label}</p>

      {topAction.impactLabel && (
        <p className="text-sm font-semibold mt-2" style={{ color: "#00c97a" }}>
          {topAction.impactLabel}
        </p>
      )}

      {topAction.monthlySavingsFormatted && (
        <p className="text-sm text-gray-500 mt-1">
          Economia:{" "}
          <span className="font-semibold text-gray-700">
            {topAction.monthlySavingsFormatted}/mês
          </span>
        </p>
      )}

      {topAction.performance && (
        <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-600 space-y-1">
          <p>
            Taxa de sucesso:{" "}
            <span className="font-semibold">{topAction.performance.successRate}%</span>
          </p>
          <p>
            Resultado comprovado:{" "}
            <span className="font-semibold">{topAction.performance.actualSavingsFormatted}</span>
          </p>
        </div>
      )}

      <button
        onClick={onAction}
        className="mt-5 w-full py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#00c97a" }}
      >
        {topAction.ctaLabel}
      </button>
    </div>
  );
}
