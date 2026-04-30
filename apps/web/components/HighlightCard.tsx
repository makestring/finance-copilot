type Props = { title: string; value: string; subtitle: string };

export function HighlightCard({ title, value, subtitle }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
