import { useState } from "react";
import { ChevronLeft, ChevronDown, ExternalLink, Bookmark, MoreHorizontal, Check, Minus, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Report, Verdict, Weight } from "./dummy-report";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const initials = (n: string) =>
  n.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const pctOf = (s: number) => Math.round(s * 20);
const oppLabelOf = (s: number) => (s >= 4 ? "Strong Opportunity" : s >= 3 ? "Fair Opportunity" : "Weak Opportunity");

// Legitimacy tier → tonal chip (theme tokens). Single source of truth.
const legitTone = (tier: string) => {
  const t = tier.toLowerCase();
  if (/high|trust|legit|solid/.test(t)) return "bg-positive-soft text-positive";
  if (/caution|proceed|review|mixed/.test(t)) return "bg-caution-soft text-caution";
  if (/susp|scam|risk|ghost|low/.test(t)) return "bg-negative-soft text-negative";
  return "bg-muted text-muted-foreground";
};

const verdictMeta: Record<Verdict, { label: string; cls: string; Icon: LucideIcon }> = {
  strong: { label: "Strong", cls: "bg-positive-soft text-positive", Icon: Check },
  partial: { label: "Partial", cls: "bg-caution-soft text-caution", Icon: Minus },
  gap: { label: "Gap", cls: "bg-negative-soft text-negative", Icon: AlertTriangle },
};
const weightMeta: Record<Weight, { cls: string; Icon: LucideIcon }> = {
  positive: { cls: "bg-positive-soft text-positive", Icon: Check },
  concerning: { cls: "bg-caution-soft text-caution", Icon: AlertTriangle },
  neutral: { cls: "bg-muted text-muted-foreground", Icon: Minus },
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "match", label: "CV Match" },
  { id: "strategy", label: "Game Plan" },
  { id: "interview", label: "Interview" },
  { id: "legit", label: "Legitimacy" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── shared bits ─────────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]", className)}>
      {children}
    </div>
  );
}
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
function MiniHead({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2.5 mt-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{children}</h4>;
}
const tldrCls = "rounded-lg border-l-2 border-brand bg-brand-soft px-3 py-2.5 text-[13px] leading-relaxed text-foreground";
const noteCls = "rounded-xl border border-border bg-card p-3.5 text-[13px] leading-relaxed text-muted-foreground";
const chip = "rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground";

// ── left identity / score card (intentional dark hero rail) ──────────────────────
function LeftCard({ r }: { r: Report }) {
  const quickFacts: string[] = [
    r.roleSummary.workMode,
    ...(r.header.experience ? [`${r.header.experience} exp`] : []),
    ...(r.header.openings != null ? [`${r.header.openings} openings`] : []),
    `${r.comp.currency}${r.comp.bandMin}–${r.comp.bandMax} ${r.comp.unit}`,
  ];
  const pct = pctOf(r.header.score);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-md)]">
      {/* gradient banner — the one decorative accent */}
      <div className="relative h-24 w-full" style={{ background: "linear-gradient(to right, #FFAF7B, #D76D77, #3A1C71)" }}>
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <button type="button" aria-label="Save" className="grid size-8 place-items-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-black/35">
            <Bookmark className="size-4" />
          </button>
          <button type="button" aria-label="More" className="grid size-8 place-items-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-black/35">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>
      <div className="p-5 text-foreground">
        {/* identity — logo straddles the banner, legitimacy to its right, details below */}
        <div className="relative z-10 -mt-12">
          <div className="flex items-start justify-between gap-3">
            <div className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-muted text-lg font-extrabold text-foreground ring-4 ring-card">
              {r.header.logoUrl ? <img src={r.header.logoUrl} alt="" className="size-full object-contain" /> : initials(r.header.company)}
            </div>
            <span className={cn("mt-[34px] shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-bold", legitTone(r.header.legitimacy))}>
              {r.header.legitimacy}
            </span>
          </div>
          <div className="mt-6 min-w-0">
            <h1 className="text-base font-bold leading-tight">{r.header.role}</h1>
            <div className="mt-1 text-xs text-muted-foreground">{r.header.company} · {fmtDate(r.header.postedAt)}</div>

            <div className="mt-3 flex flex-col gap-3.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Location</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.header.location.split(",").map((s) => s.trim()).filter(Boolean).map((city) => (
                    <span key={city} className="rounded-md bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">{city}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Details</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {quickFacts.map((f) => (
                    <span key={f} className="rounded-md bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* opportunity — single card (fit score as secondary stat) */}
        <div className="my-5 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline leading-none">
                <span className="text-4xl font-extrabold text-brand">{pct}</span>
                <span className="text-base font-medium text-muted-foreground">%</span>
              </div>
              <div className="mt-1.5 text-[13px] font-bold text-foreground">{oppLabelOf(r.header.score)}</div>
              <div className="text-[10px] text-muted-foreground">Across {r.dimensions.length} career dimensions</div>
            </div>
            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Fit Score</div>
              <div className="mt-1.5 flex items-baseline justify-end gap-1">
                <span className="text-3xl font-extrabold leading-none text-foreground">{r.header.score.toFixed(1)}</span>
                <span className="text-[15px] font-medium text-muted-foreground">/ 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* breakdown bars — each dimension its own colour */}
        <div className="mb-2.5 mt-5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Breakdown</div>
        {r.dimensions.map((d) => (
          <div key={d.label} className="mt-2.5 first:mt-0">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-foreground">{d.label}</span>
              <b style={{ color: d.hex }}>{d.score * 10}%</b>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${d.score * 10}%`, backgroundColor: d.hex }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── panels ──────────────────────────────────────────────────────────────────────
function Overview({ r }: { r: Report }) {
  const defs: [string, string][] = [
    ["Archetype", r.roleSummary.archetype],
    ["Domain", r.roleSummary.domain],
    ["Function", r.roleSummary.function],
    ["Seniority", r.roleSummary.seniority],
    ["Work mode", r.roleSummary.workMode],
    ["Team size", r.roleSummary.teamSize],
  ];
  return (
    <div>
      <SectionTitle title="Role Summary" sub="what this job is" />
      <p className={tldrCls}>{r.roleSummary.tldr}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {defs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <MiniHead>Keywords</MiniHead>
      <div className="flex flex-wrap gap-2">
        {r.keywords.map((k) => <span key={k} className={chip}>{k}</span>)}
      </div>
    </div>
  );
}

function SubPill({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count != null && (
        <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular-nums", active ? "bg-black/15 text-brand-foreground" : "bg-muted text-muted-foreground")}>{count}</span>
      )}
    </button>
  );
}

function ReqRow({ m }: { m: Report["cvMatch"][number] }) {
  const [open, setOpen] = useState(false);
  const v = verdictMeta[m.verdict];
  return (
    <div className="border-t border-border first:border-t-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 py-3 text-left">
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", v.cls)}><v.Icon className="size-3" /></span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">{m.requirement}</span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", v.cls)}>{v.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="-mt-0.5 pb-3.5 pl-8 pr-7">
          <div className="text-xs leading-relaxed text-muted-foreground">{m.evidence}</div>
          {m.note && <div className="mt-1 text-[11px] font-medium text-caution">⚑ {m.note}</div>}
        </div>
      )}
    </div>
  );
}

function CvMatch({ r }: { r: Report }) {
  const [sub, setSub] = useState<"reqs" | "gaps">("reqs");
  const strong = r.cvMatch.filter((m) => m.verdict === "strong").length;
  return (
    <div>
      <SectionTitle title="CV Match" sub={`${strong} of ${r.cvMatch.length} requirements strong`} />
      <div className="mb-4 flex gap-2">
        <SubPill active={sub === "reqs"} onClick={() => setSub("reqs")} label="Requirements" count={r.cvMatch.length} />
        <SubPill active={sub === "gaps"} onClick={() => setSub("gaps")} label="Gaps & fixes" count={r.gaps.length} />
      </div>

      {sub === "reqs" ? (
        <>
          <div className="flex flex-col">
            {r.cvMatch.map((m, i) => <ReqRow key={i} m={m} />)}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-positive/30 bg-positive-soft p-3 text-[13px] text-positive">
            <Check className="mt-0.5 size-4 shrink-0" />
            <span>{r.hardBlockers}</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          {r.gaps.map((g, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
              <span className={cn("mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", g.severity === "hard" ? "bg-negative-soft text-negative" : "bg-caution-soft text-caution")}>
                {g.severity} gap
              </span>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{g.title}</div>
                <div className="text-[13px] leading-relaxed text-muted-foreground">{g.mitigation}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Strategy({ r }: { r: Report }) {
  return (
    <div>
      <SectionTitle title="Level & Strategy" sub="how to play it" />
      <p className={tldrCls}>{r.strategy.levelFit}</p>
      <MiniHead>Sell senior — without lying</MiniHead>
      <ul className="flex flex-col gap-3">
        {r.strategy.sell.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-foreground">
            <span className="font-extrabold text-brand">›</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <MiniHead>If they down-level / down-comp</MiniHead>
      <p className={noteCls}>{r.strategy.note}</p>
    </div>
  );
}

function Comp({ r }: { r: Report }) {
  const { comp } = r;
  const scale = Math.ceil(Math.max(comp.target, comp.bandMax) * 1.05);
  const pct = (v: number) => `${(v / scale) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle title="Comp & Demand" sub="band vs target" />
        <span className="-mt-2 shrink-0 rounded-full bg-caution-soft px-2.5 py-1 text-[11px] font-bold text-caution">Comp {comp.score}/5</span>
      </div>
      <div className="relative my-[34px] h-3 rounded-full bg-muted">
        <div className="absolute top-0 h-full rounded-full bg-positive/25" style={{ left: pct(comp.bandMin), width: pct(comp.bandMax - comp.bandMin) }} />
        <div className="absolute top-0 h-full rounded-full bg-positive" style={{ left: pct(comp.likelyMin), width: pct(comp.likelyMax - comp.likelyMin) }} />
        <div className="absolute -bottom-2 -top-2 w-0.5 bg-foreground" style={{ left: pct(comp.target) }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-foreground">
            {comp.currency}{comp.target} target
          </span>
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{comp.currency}0</span>
        <span className="font-semibold text-foreground">Likely {comp.currency}{comp.likelyMin}–{comp.likelyMax} {comp.unit}</span>
        <span>{comp.currency}{scale}</span>
      </div>
      <p className="mt-3.5 text-[13px] leading-relaxed text-foreground">{comp.read}</p>
      <MiniHead>Market data</MiniHead>
      <div className="flex flex-col">
        {comp.findings.map((f, i) => (
          <div key={i} className="flex justify-between gap-3 border-t border-border py-2 text-xs first:border-t-0">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="text-right font-medium text-foreground">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tailor({ r }: { r: Report }) {
  return (
    <div>
      <SectionTitle title="Tailor Your CV" sub="before you apply" />
      <div className="flex flex-col">
        {r.customization.map((c, i) => (
          <div key={i} className="flex gap-3.5 border-t border-border py-3.5 first:border-t-0">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-positive-soft text-[13px] font-bold text-positive">{i + 1}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground">{c.section} — <span className="font-normal text-foreground/80">{c.change}</span></div>
              <div className="mt-0.5 text-xs text-muted-foreground">Why: {c.why}</div>
            </div>
          </div>
        ))}
      </div>
      <MiniHead>Top LinkedIn changes</MiniHead>
      <ul className="flex flex-col gap-2">
        {r.linkedin.map((l, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground">
            <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Plan({ r }: { r: Report }) {
  const [sub, setSub] = useState<"approach" | "comp" | "tailor">("approach");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <SubPill active={sub === "approach"} onClick={() => setSub("approach")} label="Strategy" />
        <SubPill active={sub === "comp"} onClick={() => setSub("comp")} label="Compensation" />
        <SubPill active={sub === "tailor"} onClick={() => setSub("tailor")} label="Tailor CV" count={r.customization.length} />
      </div>
      {sub === "approach" ? <Strategy r={r} /> : sub === "comp" ? <Comp r={r} /> : <Tailor r={r} />}
    </div>
  );
}

function Interview({ r }: { r: Report }) {
  const [sub, setSub] = useState<"stories" | "flags">("stories");
  return (
    <div>
      <SectionTitle title="Interview Plan" sub="how to walk in prepared" />
      <p className={tldrCls}><span className="font-bold">Lead with: </span>{r.interview.caseStudy}</p>
      <div className="mb-4 mt-4 flex gap-2">
        <SubPill active={sub === "stories"} onClick={() => setSub("stories")} label="STAR stories" count={r.interview.stories.length} />
        <SubPill active={sub === "flags"} onClick={() => setSub("flags")} label="Red flags" count={r.interview.redFlags.length} />
      </div>
      {sub === "stories" ? (
        <div className="flex flex-col gap-2.5">
          {r.interview.stories.map((s, i) => (
            <div key={i} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-foreground">{s.title}</div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{s.requirement}</span>
              </div>
              <div className="mt-1.5 flex gap-2 text-[13px]">
                <span className="font-bold text-brand">→</span>
                <span className="font-semibold text-foreground">{s.result}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Reflection: {s.reflection}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {r.interview.redFlags.map((qa, i) => (
            <div key={i} className="rounded-xl border border-border p-3.5">
              <div className="text-[13px] font-semibold text-foreground">“{qa.q}”</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">→ {qa.a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legitimacy({ r }: { r: Report }) {
  return (
    <div>
      <SectionTitle title="Posting Legitimacy" sub="is this job real?" />
      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", legitTone(r.legitimacy.tier))}>{r.legitimacy.tier}</span>
      <div className="mt-3.5 flex flex-col">
        {r.legitimacy.signals.map((s, i) => {
          const w = weightMeta[s.weight];
          return (
            <div key={i} className="flex items-start gap-3 border-t border-border py-2.5 first:border-t-0">
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", w.cls)}><w.Icon className="size-3" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground">{s.signal}</div>
                <div className="text-xs leading-snug text-muted-foreground">{s.finding}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className={cn(noteCls, "mt-3.5")}>{r.legitimacy.note}</p>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────────
export function ReportView({ report, incomplete, onBack }: { report: Report; incomplete?: boolean; onBack: () => void }) {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* header — keeps navigation while a report is open */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Reports
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate text-sm font-medium text-foreground">
          {report.header.company} — {report.header.role}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-1 pb-6 pt-7">
          {/* layout: left card + right column */}
          <div className="grid grid-cols-1 items-start gap-5 min-[840px]:grid-cols-[352px_1fr]">
            <div className="min-[840px]:sticky min-[840px]:top-3.5">
              <LeftCard r={report} />
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              {incomplete ? (
                <Card>
                  <div className="p-10 text-center">
                    <p className="text-sm font-semibold text-foreground">No detailed report available</p>
                    <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      This evaluation doesn't include a full A–G breakdown — only the score and basic info (shown on the left).
                    </p>
                  </div>
                </Card>
              ) : (
                <>
              {/* header row: tabs + apply */}
              <div className="flex items-center justify-between gap-3 px-0.5">
                <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="min-w-0">
                  <TabsList>
                    {TABS.map((t) => (
                      <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Button size="sm" className="shrink-0 gap-1.5 rounded-full bg-foreground text-background hover:bg-foreground/90">
                  Apply <ExternalLink className="size-3.5" />
                </Button>
              </div>

              {/* panel card */}
              <Card>
                <div className="p-5">
                  {tab === "overview" && <Overview r={report} />}
                  {tab === "match" && <CvMatch r={report} />}
                  {tab === "strategy" && <Plan r={report} />}
                  {tab === "interview" && <Interview r={report} />}
                  {tab === "legit" && <Legitimacy r={report} />}
                </div>
              </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
