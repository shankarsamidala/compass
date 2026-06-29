/**
 * parse-report — maps a real evaluation (scalar columns + raw_report markdown) into the
 * `Report` model the UI renders. raw_report is the canonical source (machine_summary is
 * drifted/empty across rows); scalar columns are used for the header where reliable.
 *
 * Everything is best-effort + defensive: a missing/odd section yields empty arrays / "—",
 * never a throw. `isEmptyReport()` lets the UI show a graceful fallback for the rare rows
 * whose raw_report is empty/headingless.
 */
import type { EvaluationDetail } from "@compass/ipc-contract";
import type { Report, Verdict, Weight, Recommendation } from "./dummy-report";

// Stable colours for the 7 derived dimensions (report has no per-dimension scores).
const DIM_HEX: Record<string, string> = {
  "CV Match": "#3B82F6",
  "Level Fit": "#10B981",
  Compensation: "#8B5CF6",
  "Growth & Demand": "#F59E0B",
  "Domain Fit": "#EC4899",
  "Skill Coverage": "#06B6D4",
  Legitimacy: "#EAB308",
};

const DASH = "—";
const strip = (s: string) => s.replace(/\*\*/g, "").replace(/(^|[^*])\*([^*]+)\*/g, "$1$2").replace(/\s+/g, " ").trim();

// ── markdown helpers ─────────────────────────────────────────────────────────────
/** Split a report into a map keyed by normalized section ("a".."h", "keywords", "cover"). */
function sectionMap(md: string): Map<string, string> {
  const map = new Map<string, string>();
  const parts = md.split(/\n(?=##\s)/);
  for (const block of parts) {
    const head = block.match(/^##\s+(.*)/);
    if (!head) {
      map.set("_preamble", block);
      continue;
    }
    map.set(normHeading(head[1]), block.replace(/^##\s+.*\n?/, "").trim());
  }
  return map;
}
function normHeading(h: string): string {
  const t = h.toLowerCase();
  if (/^a\)|role summary/.test(t)) return "a";
  if (/^b\)|match with cv/.test(t)) return "b";
  if (/^c\)|level and strategy/.test(t)) return "c";
  if (/^d\)|comp and demand/.test(t)) return "d";
  if (/^e\)|customization/.test(t)) return "e";
  if (/^f\)|interview/.test(t)) return "f";
  if (/^g\)|legitimacy/.test(t)) return "g";
  if (/^h\)|draft application/.test(t)) return "h";
  if (/keywords/.test(t)) return "keywords";
  if (/cover letter/.test(t)) return "cover";
  if (/machine summary/.test(t)) return "machine";
  return t.trim();
}

/** Rows of a markdown table (header row included, separator rows dropped). */
function tableRows(body: string): string[][] {
  return body
    .split("\n")
    .filter((l) => /^\s*\|/.test(l))
    .filter((l) => !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
    .map((l) => l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
}
/** Table rows mapped to objects keyed by (lowercased) header column name. */
function mappedTable(body: string): Record<string, string>[] {
  const rows = tableRows(body);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}
/** 2-column table → key(lowercased)→value map (skips the header row). */
function kvTable(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of tableRows(body).slice(1)) if (r.length >= 2 && r[0]) out[r[0].toLowerCase()] = r[1];
  return out;
}
/** First non-empty column value whose header contains any of `keys`. */
function pick(o: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const h = Object.keys(o).find((x) => x.includes(k));
    if (h && o[h]) return o[h];
  }
  return "";
}
function msScalar(ms: unknown, key: string): string | null {
  if (!ms || typeof ms !== "object") return null;
  const v = (ms as Record<string, unknown>)[key];
  return typeof v === "string" ? v.trim() || null : v == null ? null : String(v);
}

// ── field helpers ────────────────────────────────────────────────────────────────
function verdictOf(cell: string): Verdict {
  const t = cell.toLowerCase();
  if (/⚠|gap|not (evidenced|explicit)|no direct|missing/.test(t)) return "gap";
  if (/partial|to confirm/.test(t)) return "partial";
  return "strong";
}
function noteOf(cell: string): string | undefined {
  const m = cell.match(/\(([^)]+)\)/);
  return m && /confirm|gke|caveat|soft/i.test(m[1]) ? strip(m[1]) : undefined;
}
function weightOf(cell: string): Weight {
  const t = cell.toLowerCase();
  if (/positive|strong|good/.test(t)) return "positive";
  if (/concern|negative|weak|risk/.test(t)) return "concerning";
  return "neutral";
}
function splitRemote(v: string): { workMode: string; location: string } {
  const parts = v.split(/\s+[—–-]\s+/);
  if (parts.length > 1) {
    return { workMode: strip(parts[0]), location: parts.slice(1).join(" ").replace(/\s*\/\s*/g, ", ").trim() };
  }
  return { workMode: strip(v), location: "" };
}
function recommendationOf(score: number, ms: unknown): Recommendation {
  const rec = (msScalar(ms, "recommendation") ?? msScalar(ms, "next_action") ?? "").toLowerCase();
  if (/apply/.test(rec)) return "Apply";
  if (/consider|maybe/.test(rec)) return "Consider";
  if (/skip|avoid|pass/.test(rec)) return "Skip";
  return score >= 4 ? "Apply" : score >= 3 ? "Consider" : "Skip";
}

// ── section parsers ──────────────────────────────────────────────────────────────
function parseGaps(b: string): Report["gaps"] {
  const idx = b.search(/gaps?\s*[+&]\s*mitigation/i);
  if (idx < 0) return [];
  let block = b.slice(idx).replace(/^[^\n]*\n/, "");
  const stop = block.search(/no hard blockers/i);
  if (stop >= 0) block = block.slice(0, stop);
  return block
    .split(/\n(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter((s) => /^\d+\./.test(s))
    .map((it) => {
      const title = strip(it.match(/\*\*(.+?)\*\*/)?.[1] ?? it.replace(/^\d+\.\s*/, "").slice(0, 60));
      const sev = (it.match(/—\s*\*([^*]+)\*/)?.[1] ?? "").toLowerCase();
      const severity: "hard" | "soft" = /\bhard\b|blocker(?!.*(non|not))/.test(sev) ? "hard" : "soft";
      let mit = it.replace(/^\d+\.\s*\*\*.+?\*\*\s*—\s*\*[^*]+\*\.?\s*/, "").trim();
      if (!mit) mit = it.replace(/^\d+\.\s*/, "");
      return { title: title.replace(/\s*\([^)]*\)\s*$/, ""), severity, mitigation: strip(mit) };
    });
}

function parseStrategy(c: string): Report["strategy"] {
  const lines = c.split("\n");
  let levelFit = "";
  let note = "";
  const sell: string[] = [];
  let inSell = false;
  for (const raw of lines) {
    const sub = raw.match(/^\s{2,}-\s+(.*)/);
    const top = raw.match(/^-\s+(.*)/);
    if (sub && inSell) {
      sell.push(strip(sub[1]));
      continue;
    }
    if (top) {
      const t = top[1];
      if (/sell senior/i.test(t)) inSell = true;
      else if (/^\*{0,2}if\b/i.test(t.trimStart())) {
        note = strip(t.replace(/^[^:]*:\s*/, ""));
        inSell = false;
      } else if (/jd level|your (natural )?level|aligned|level:/i.test(t) || !levelFit) {
        levelFit = strip(t);
        inSell = false;
      } else inSell = false;
    }
  }
  if (sell.length === 0) sell.push(...lines.filter((l) => /^\s+-\s/.test(l)).map((l) => strip(l.replace(/^\s*-\s*/, ""))));
  return { levelFit: levelFit || DASH, sell, note };
}

function parseComp(d: string, ms: unknown): Report["comp"] {
  const findings = mappedTable(d)
    .map((o) => ({ label: pick(o, "data point", "metric", "point") || Object.values(o)[0] || "", value: pick(o, "finding") || Object.values(o)[1] || "" }))
    .filter((f) => f.label && f.value);
  const read = strip(d.match(/\*\*Read:\*\*\s*([\s\S]+?)(?:\n##|$)/i)?.[1] ?? "");
  const num = (m: RegExpMatchArray | null | undefined) => (m ? [Number(m[1]), Number(m[2])] : null);
  const target = Number((d.match(/(\d+)\s*LPA\s*target/i) ?? d.match(/target[^\d]{0,14}(\d+)\s*LPA/i) ?? read.match(/(\d+)\s*LPA\s*target/i) ?? read.match(/target[^\d]{0,14}(\d+)/i))?.[1] ?? 0);
  // band: prefer the report's own summary phrasing, else the role-specific estimate row,
  // else the first range in the table that sits at/below the target.
  const estRow = findings.find((f) => /(expect|probable|est\.?|this (role|lead))/i.test(f.label + f.value) && /\d+\s*[–-]\s*\d+/.test(f.value));
  const tableBands = [...d.matchAll(/₹?\s*(\d+)\s*[–-]\s*(\d+)\s*LPA/gi)].map((m) => [Number(m[1]), Number(m[2])]);
  const band =
    num(read.match(/(?:realistic\s+)?band[^.\n]*?₹?\s*(\d+)\s*[–-]\s*(\d+)/i)) ??
    num(d.match(/expect[^.\n]*?₹?\s*(\d+)\s*[–-]\s*(\d+)/i)) ??
    num(estRow?.value.match(/(\d+)\s*[–-]\s*(\d+)/)) ??
    (target ? tableBands.find((b) => b[1] <= target) : null) ??
    tableBands[0] ??
    [0, 0];
  const likely = num(read.match(/likely\s*₹?\s*(\d+)\s*[–-]\s*(\d+)/i) ?? d.match(/likely\s*₹?\s*(\d+)\s*[–-]\s*(\d+)/i)) ?? band;
  const vs = (msScalar(ms, "comp_vs_target") ?? "").toLowerCase();
  const score = /below|under/.test(vs) || (target && target > band[1]) ? 3 : /above|over/.test(vs) ? 5 : 4;
  return { currency: "₹", unit: "LPA", bandMin: band[0], bandMax: band[1], likelyMin: likely[0], likelyMax: likely[1], target, score, read, findings };
}

function parseTailor(e: string): { customization: Report["customization"]; linkedin: string[] } {
  const customization = mappedTable(e)
    .map((o) => ({ section: strip(pick(o, "section")), change: strip(pick(o, "proposed change", "change", "fix")), why: strip(pick(o, "why", "reason")) }))
    .filter((c) => c.section);
  let linkedin: string[] = [];
  const li = e.match(/top \d+ linkedin changes?:?\**\s*([\s\S]+?)(?:\n\n|\n##|$)/i)?.[1] ?? "";
  if (li) {
    linkedin = li.split(/\s*\(\d+\)\s*/).map((s) => strip(s.replace(/;$/, ""))).filter(Boolean);
    if (linkedin.length <= 1) linkedin = li.split(/;|\n\s*-\s*/).map((s) => strip(s)).filter(Boolean);
  }
  return { customization, linkedin };
}

function parseInterview(f: string): Report["interview"] {
  const stories = mappedTable(f)
    .map((o) => ({
      requirement: strip(pick(o, "jd requirement", "requirement")),
      title: strip(pick(o, "story")),
      result: strip(o["r"] || pick(o, "result")),
      reflection: strip(pick(o, "reflection")),
    }))
    .filter((s) => s.title);
  const caseStudy = strip(f.match(/recommended case study:?\**\s*([\s\S]+?)(?:\n\n|\n\*\*|\n##|$)/i)?.[1] ?? "");
  const rfIdx = f.search(/red-?flag/i);
  const redFlags =
    rfIdx < 0
      ? []
      : f
          .slice(rfIdx)
          .split("\n")
          .filter((l) => /^-\s/.test(l))
          .map((l) => {
            const q = l.match(/[“"]([^”"]+)[”"]/)?.[1] ?? l.match(/\*["']?(.+?)["']?\*/)?.[1] ?? "";
            const a = (l.split(/→|->/)[1] ?? "").trim();
            return { q: strip(q), a: strip(a) };
          })
          .filter((x) => x.q || x.a);
  return { caseStudy, stories, redFlags };
}

function parseLegitimacy(g: string, fallbackTier: string): Report["legitimacy"] {
  const tier = strip(g.match(/assessment:?\**\s*([^\n*]+)/i)?.[1] ?? "") || fallbackTier || DASH;
  const signals = mappedTable(g)
    .map((o) => ({ signal: strip(pick(o, "signal") || Object.values(o)[0] || ""), finding: strip(pick(o, "finding") || Object.values(o)[1] || ""), weight: weightOf(pick(o, "weight") || Object.values(o)[2] || "") }))
    .filter((s) => s.signal);
  const note = strip(g.match(/context notes?:?\**\s*([\s\S]+?)(?:\n##|$)/i)?.[1] ?? "");
  return { tier, signals, note };
}

// ── dimensions (derived — report has no per-dimension scores) ─────────────────────
function deriveDimensions(r: Omit<Report, "dimensions">): Report["dimensions"] {
  const total = r.cvMatch.length || 1;
  const strong = r.cvMatch.filter((m) => m.verdict === "strong").length;
  const covered = r.cvMatch.filter((m) => m.verdict !== "gap").length;
  const t = r.legitimacy.tier.toLowerCase();
  const legit = /high|trust|solid/.test(t) ? 9 : /caution|proceed|mixed/.test(t) ? 6 : /susp|risk|ghost/.test(t) ? 3 : 7;
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const vals: Record<string, number> = {
    "CV Match": clamp((strong / total) * 10),
    "Level Fit": /align|no down-?level/i.test(r.strategy.levelFit) ? 9 : 7,
    Compensation: clamp(r.comp.score * 2),
    "Growth & Demand": /rising|growing|high demand/i.test(r.comp.read + r.comp.findings.map((f) => f.value).join(" ")) ? 8 : 6,
    "Domain Fit": clamp(((strong + covered) / (2 * total)) * 10),
    "Skill Coverage": clamp((covered / total) * 10),
    Legitimacy: legit,
  };
  return Object.entries(DIM_HEX).map(([label, hex]) => ({ label, score: vals[label] ?? 7, hex }));
}

// ── public ───────────────────────────────────────────────────────────────────────
/** True when raw_report can't be parsed into a meaningful report (empty / headingless). */
export function isEmptyReport(detail: EvaluationDetail): boolean {
  const md = detail.rawReport ?? "";
  return !/##\s*(A\)|Role Summary|B\)|Match with CV)/i.test(md);
}

export function parseReport(detail: EvaluationDetail): Report {
  const md = detail.rawReport ?? "";
  const ms = detail.machineSummary;
  const S = sectionMap(md);
  const score = detail.score ?? 0;

  const a = kvTable(S.get("a") ?? "");
  const remote = splitRemote(a["remote"] ?? a["work mode"] ?? "");
  const roleSummary: Report["roleSummary"] = {
    archetype: a["archetype"] || detail.archetype || DASH,
    domain: a["domain"] || DASH,
    function: a["function"] || DASH,
    seniority: a["seniority"] || DASH,
    workMode: remote.workMode || DASH,
    teamSize: a["team size"] || a["team"] || DASH,
    tldr: a["tl;dr"] || a["tldr"] || "",
  };

  const bBody = S.get("b") ?? "";
  const cvMatch: Report["cvMatch"] = tableRows(bBody)
    .slice(1)
    .filter((r) => r.length >= 3 && r[0])
    .map((r) => ({ requirement: strip(r[0]), evidence: strip(r[1]), verdict: verdictOf(r[2]), note: noteOf(r[2]) }));
  const gaps = parseGaps(bBody);
  const hardBlockers = strip(bBody.match(/(no hard blockers[^.\n]*\.?[^.\n]*\.?)/i)?.[1] ?? "");

  const comp = parseComp(S.get("d") ?? "", ms);
  const { customization, linkedin } = parseTailor(S.get("e") ?? "");
  const interview = parseInterview(S.get("f") ?? "");
  const legitimacy = parseLegitimacy(S.get("g") ?? "", detail.legitimacyTier ?? "");
  const keywords = (S.get("keywords") ?? "").replace(/\n/g, " ").split(",").map((s) => strip(s)).filter(Boolean);
  const strategy = parseStrategy(S.get("c") ?? "");

  const expMatch = roleSummary.seniority.match(/(\d+\s*[–-]\s*\d+\s*yrs?|\d+\+?\s*yrs?)/i);
  const base: Omit<Report, "dimensions"> = {
    header: {
      company: detail.companyName ?? DASH,
      role: detail.roleTitle ?? DASH,
      logoUrl: detail.logoUrl ?? null,
      location: remote.location || detail.location || DASH,
      score,
      recommendation: recommendationOf(score, ms),
      legitimacy: detail.legitimacyTier || legitimacy.tier || DASH,
      postedAt: detail.createdAt,
      applyUrl: detail.jobUrl ?? null,
      experience: expMatch ? expMatch[1].replace(/\s+/g, " ") : undefined,
    },
    roleSummary,
    cvMatch,
    gaps,
    hardBlockers,
    strategy,
    comp,
    customization,
    linkedin,
    interview,
    legitimacy,
    keywords,
  };
  return { ...base, dimensions: deriveDimensions(base) };
}
