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
  const clamped = Math.min(100, Math.max(0, value));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
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
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">
          Score financeiro
        </p>
        <p className="text-lg font-semibold text-gray-800 leading-snug">{label}</p>
      </div>
    </div>
  );
}
