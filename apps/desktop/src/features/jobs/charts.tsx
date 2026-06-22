/**
 * Tiny dependency-free SVG charts for the jobs UI.
 * - ScoreRing: a single-value radial gauge (fit score out of 5).
 * - Donut: a multi-slice donut (e.g. Apply/Consider/Skip mix) with a legend.
 */

function scoreColor(pct: number): string {
  if (pct >= 0.8) return "#22c55e"; // green
  if (pct >= 0.6) return "#84cc16"; // lime
  if (pct >= 0.4) return "#eab308"; // amber
  return "#f97316"; // orange
}

export function ScoreRing({
  value,
  max = 5,
  size = 72,
  stroke = 7,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-lg font-bold text-white">{value.toFixed(1)}</span>
        <span className="text-[9px] text-muted-foreground">/ {max}</span>
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  size = 96,
  stroke = 16,
}: {
  data: DonutSlice[];
  size?: number;
  stroke?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        {total > 0 &&
          data.map((d) => {
            const frac = d.value / total;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${c * frac} ${c * (1 - frac)}`}
                strokeDashoffset={-offset}
              />
            );
            offset += c * frac;
            return seg;
          })}
      </svg>
      <ul className="space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-foreground/80">{d.label}</span>
            <span className="font-semibold tabular-nums text-white">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
