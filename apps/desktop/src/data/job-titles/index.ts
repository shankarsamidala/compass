// Aggregated job-title list (spotterful.com A–Z). 13334 titles.
// Used for Target Roles in onboarding + preferences (local, no API call).
import { TITLES_A } from "./a";
import { TITLES_B } from "./b";
import { TITLES_C } from "./c";
import { TITLES_D } from "./d";
import { TITLES_E } from "./e";
import { TITLES_F } from "./f";
import { TITLES_G } from "./g";
import { TITLES_H } from "./h";
import { TITLES_I } from "./i";
import { TITLES_J } from "./j";
import { TITLES_K } from "./k";
import { TITLES_L } from "./l";
import { TITLES_M } from "./m";
import { TITLES_N } from "./n";
import { TITLES_O } from "./o";
import { TITLES_P } from "./p";
import { TITLES_Q } from "./q";
import { TITLES_R } from "./r";
import { TITLES_S } from "./s";
import { TITLES_T } from "./t";
import { TITLES_U } from "./u";
import { TITLES_V } from "./v";
import { TITLES_W } from "./w";
import { TITLES_X } from "./x";
import { TITLES_Y } from "./y";
import { TITLES_Z } from "./z";

/**
 * Local, case-insensitive search over the job-title list (replaces the role
 * suggest API). Prefix matches rank above substring matches; capped to `limit`
 * so pickers stay fast against the full ~13k entries.
 */
export function searchJobTitles(query: string, limit = 50): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const t of JOB_TITLES) {
    const tl = t.toLowerCase();
    if (tl.startsWith(q)) starts.push(t);
    else if (tl.includes(q)) contains.push(t);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** All job titles, flattened across A–Z. */
export const JOB_TITLES: string[] = [
  ...TITLES_A,
  ...TITLES_B,
  ...TITLES_C,
  ...TITLES_D,
  ...TITLES_E,
  ...TITLES_F,
  ...TITLES_G,
  ...TITLES_H,
  ...TITLES_I,
  ...TITLES_J,
  ...TITLES_K,
  ...TITLES_L,
  ...TITLES_M,
  ...TITLES_N,
  ...TITLES_O,
  ...TITLES_P,
  ...TITLES_Q,
  ...TITLES_R,
  ...TITLES_S,
  ...TITLES_T,
  ...TITLES_U,
  ...TITLES_V,
  ...TITLES_W,
  ...TITLES_X,
  ...TITLES_Y,
  ...TITLES_Z,
];
