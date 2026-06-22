import { useState } from "react";

interface Bar {
  label: string;
  score: number;
  hex: string;
}

export function SVGPolarChart({ bars, centerLabel }: { bars: Bar[]; centerLabel?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const cx = 90,
    cy = 90,
    maxR = 78,
    steps = 5;
  const angleStep = (2 * Math.PI) / bars.length;
  const gridRadii = Array.from({ length: steps }, (_, i) => maxR * ((i + 1) / steps));
  const total = bars.reduce((a, b) => a + b.score, 0);

  const slices = bars.map((bar, i) => {
    const startAngle = i * angleStep - Math.PI / 2;
    const endAngle = startAngle + angleStep;
    const r = (bar.score / 10) * maxR;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = angleStep > Math.PI ? 1 : 0;
    const sharePct = Math.round((bar.score / total) * 100);
    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      hex: bar.hex,
      sharePct,
    };
  });

  return (
    <div className="relative">
      {hovered !== null && tooltip && (
        <div
          className="bg-popover border-border pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -110%)" }}
        >
          <p className="text-foreground font-semibold">{bars[hovered].label}</p>
          <p className="text-muted-foreground">{slices[hovered].sharePct}%</p>
        </div>
      )}
      <svg width={180} height={180} viewBox="0 0 180 180">
        {gridRadii.map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={0.75} className="text-muted-foreground/20" />
        ))}
        {bars.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="currentColor" strokeWidth={0.75} className="text-muted-foreground/20" />
          );
        })}
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.hex}
            fillOpacity={hovered === i ? 0.35 : 0.15}
            stroke={s.hex}
            strokeOpacity={hovered === i ? 0.9 : 0.55}
            strokeWidth={1}
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={(e) => {
              setHovered(i);
              const svgEl = e.currentTarget.closest("svg")!;
              const pt = svgEl.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const svgPt = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
              setTooltip({ x: svgPt.x, y: svgPt.y - 8 });
            }}
            onMouseLeave={() => {
              setHovered(null);
              setTooltip(null);
            }}
          />
        ))}
        {centerLabel && (
          <>
            <circle cx={cx} cy={cy} r={26} className="fill-background" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 20, fontWeight: 700 }}>
              {centerLabel}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
