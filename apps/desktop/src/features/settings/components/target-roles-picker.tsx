import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, PlusSignIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useProfilePrefs, useSetTargetRoles } from "../profile-api";

/** A broad suggested set; live search (Indeed autocomplete) augments it. */
const SUGGESTED = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer",
  "DevOps Engineer", "Cloud Engineer", "Data Engineer", "Data Scientist", "ML Engineer",
  "QA Engineer", "Security Engineer", "Engineering Manager", "Platform Engineer",
  "Site Reliability Engineer", "Android Developer", "iOS Developer", "AI Engineer",
  "Product Manager", "UI/UX Designer", "Solutions Architect",
];

type TabId = "suggested" | "mine";

export function TargetRolesPicker() {
  const { data: prefs, isLoading } = useProfilePrefs();
  const save = useSetTargetRoles();
  const [tab, setTab] = useState<TabId>("suggested");
  const [q, setQ] = useState("");
  const [searchHits, setSearchHits] = useState<string[]>([]);

  const selected = prefs?.targetRoles ?? [];
  const has = (r: string) => selected.some((s) => s.toLowerCase() === r.toLowerCase());

  const toggle = (role: string) => {
    const next = has(role) ? selected.filter((s) => s.toLowerCase() !== role.toLowerCase()) : [...selected, role];
    save.mutate(next);
  };

  // Live role autocomplete (career-ops suggest → Indeed), debounced.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSearchHits([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const res = await api.suggest.query("roles", term);
      if (active) setSearchHits(res.ok ? res.data : []);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  // What the grid shows: search results, "My tags", or the suggested set.
  const tags = useMemo(() => {
    if (q.trim().length >= 2) {
      const merged = [...new Set([...searchHits, ...SUGGESTED.filter((s) => s.toLowerCase().includes(q.toLowerCase()))])];
      return merged.slice(0, 40);
    }
    if (tab === "mine") return selected;
    return [...new Set([...selected, ...SUGGESTED])];
  }, [q, searchHits, tab, selected]);

  return (
    <div>
      {/* Search */}
      <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-input/30 px-3.5">
        <HugeiconsIcon icon={Search01Icon} size={16} className="shrink-0 text-muted-foreground" />
        <input
          aria-label="Search roles"
          placeholder="Search roles"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {save.isPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Pick the roles you're targeting — or search to add your own. The more accurate these are, the better your job matches.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex flex-row gap-4 border-b border-border pb-2.5">
        <TabButton active={tab === "suggested"} onClick={() => setTab("suggested")}>Suggested</TabButton>
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          My roles{selected.length ? ` (${selected.length})` : ""}
        </TabButton>
      </div>

      {/* Grid */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tags.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {tab === "mine" ? "No roles yet — add some from Suggested." : "No matches."}
          </p>
        ) : (
          <div role="list" className="flex flex-row flex-wrap gap-3 overflow-hidden" style={{ maxHeight: "calc(2 * (2rem + 0.75rem))" }}>
            {tags.map((role) => {
              const on = has(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggle(role)}
                  className={cn(
                    "inline-flex h-8 select-none items-center gap-1 rounded-[10px] border pl-3 pr-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-input/30 text-foreground hover:bg-accent",
                  )}
                >
                  <span className="min-w-0 truncate">{role}</span>
                  <HugeiconsIcon icon={on ? Cancel01Icon : PlusSignIcon} size={16} className="shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-8 rounded-[10px] px-3 py-1.5 text-center text-sm transition-colors",
        active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && <span className="absolute -bottom-2.5 left-1/2 h-px w-4 -translate-x-1/2 bg-foreground" />}
    </button>
  );
}
