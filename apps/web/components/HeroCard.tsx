type Props = {
  title: string;
  headline: string;
  subtitle: string;
};

export function HeroCard({ title, headline, subtitle }: Props) {
  return (
    <div
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}
      className="p-7 rounded-2xl text-white"
    >
      <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">{title}</p>
      <p className="text-2xl font-bold leading-snug">{headline}</p>
      <p className="text-sm opacity-50 mt-2">{subtitle}</p>
    </div>
  );
}
