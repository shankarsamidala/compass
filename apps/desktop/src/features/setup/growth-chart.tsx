import { useEffect, useState } from "react";

/** Disable the draw-in motion when the user prefers reduced motion. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);
  return reduced;
}

const TEAL = "#0f766e"; // teal-700, the brand green
// Both lines share the Day-1 origin (20, 250).
const REINIT = "M 20 250 C 150 232, 280 156, 384 50"; // rises from day 1, accelerating upward
const ALONE = "M 20 250 Q 50 222, 80 232 Q 110 242, 140 206 Q 170 170, 200 192 Q 230 214, 260 174 Q 290 134, 320 170 Q 352 206, 384 156"; // pronounced waves rising to ~half the goal height, running to the x-axis end
const AREA = `${REINIT} L 384 282 L 20 282 Z`;
const DASH = 520; // > path length, for the draw-in

/**
 * Goal-step growth visual. A smooth reinit.ai curve (brand green, with a soft area
 * fill and an endpoint marker at "Your goal") accelerates upward while "Going
 * alone" drifts gently down — Day 1 → Day 45. Both lines draw in on mount.
 */
export function GrowthChart() {
  const reduced = useReducedMotion();

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="reinit-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TEAL} stopOpacity={0.22} />
          <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Your goal — dashed reference */}
      <line x1="20" y1="50" x2="384" y2="50" className="stroke-neutral-300" strokeWidth={1.5} strokeDasharray="5 5" />
      <text x="312" y="40" className="fill-foreground font-semibold" style={{ fontSize: 13 }}>
        Your goal
      </text>

      {/* Area under the reinit.ai curve */}
      <path d={AREA} fill="url(#reinit-area)" stroke="none" opacity={reduced ? 1 : 0}>
        {!reduced && <animate attributeName="opacity" from="0" to="1" dur="0.7s" begin="0.6s" fill="freeze" />}
      </path>

      {/* Going alone — smooth grey decline */}
      <path
        d={ALONE}
        fill="none"
        className="stroke-gray-400"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={reduced ? undefined : DASH}
        strokeDashoffset={reduced ? 0 : DASH}
      >
        {!reduced && <animate attributeName="stroke-dashoffset" from={DASH} to="0" dur="1.2s" fill="freeze" />}
      </path>
      <text x="288" y="216" className="fill-gray-400 font-medium" style={{ fontSize: 12 }}>
        Going alone
      </text>

      {/* With reinit.ai — accelerating climb */}
      <path
        d={REINIT}
        fill="none"
        className="stroke-teal-700"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={reduced ? undefined : DASH}
        strokeDashoffset={reduced ? 0 : DASH}
      >
        {!reduced && <animate attributeName="stroke-dashoffset" from={DASH} to="0" dur="1.4s" fill="freeze" />}
      </path>
      <text x="170" y="120" className="fill-teal-700 font-semibold" style={{ fontSize: 12 }}>
        With reinit.ai
      </text>

      {/* Endpoint marker at the goal */}
      <circle cx="384" cy="50" r="9" fill={TEAL} opacity={reduced ? 0.18 : 0}>
        {!reduced && <animate attributeName="opacity" from="0" to="0.18" dur="0.4s" begin="1.4s" fill="freeze" />}
      </circle>
      <circle cx="384" cy="50" r="4.5" fill={TEAL} opacity={reduced ? 1 : 0}>
        {!reduced && <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.4s" fill="freeze" />}
      </circle>

      {/* Axis */}
      <text x="20" y="292" className="fill-muted-foreground font-medium" style={{ fontSize: 12 }}>
        Day 1
      </text>
      <text x="340" y="292" className="fill-muted-foreground font-medium" style={{ fontSize: 12 }}>
        Day 45
      </text>
    </svg>
  );
}
