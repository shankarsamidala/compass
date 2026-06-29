import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, PlusSignIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { searchJobTitles } from "@/data/job-titles";
import { useProfilePrefs, useSetTargetRoles } from "../profile-api";

/** A broad suggested set surfaced as quick-add chips when the user isn't searching. */
const SUGGESTED = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer",
  "DevOps Engineer", "Cloud Engineer", "Data Engineer", "Data Scientist", "ML Engineer",
  "QA Engineer", "Security Engineer", "Engineering Manager", "Platform Engineer",
  "Site Reliability Engineer", "Android Developer", "iOS Developer", "AI Engineer",
  "Product Manager", "UI/UX Designer", "Solutions Architect",
];

export function TargetRolesPicker() {
  const { data: prefs, isLoading } = useProfilePrefs();
  const save = useSetTargetRoles();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<string[]>([]);

  const selected = prefs?.targetRoles ?? [];
  const has = (r: string) => selected.some((s) => s.toLowerCase() === r.toLowerCase());

  const add = (role: string) => {
    if (!has(role)) save.mutate([...selected, role]);
    setQ("");
  };
  const remove = (role: string) => save.mutate(selected.filter((s) => s.toLowerCase() !== role.toLowerCase()));

  // Local role search (no API) — results render directly under the input.
  useEffect(() => {
    const term = q.trim();
    setHits(term.length < 2 ? [] : searchJobTitles(term, 40));
  }, [q]);

  const term = q.trim();
  const searching = term.length >= 2;

  // Matches to add (already-selected removed); offer the raw term as a creatable row.
  const results = useMemo(() => {
    const list = hits.filter((h) => !has(h));
    const exact = list.some((h) => h.toLowerCase() === term.toLowerCase());
    if (term && !exact && !has(term)) list.unshift(term);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits, term, selected]);

  const suggestions = SUGGESTED.filter((s) => !has(s));

  return (
    <div className="flex flex-col gap-3">
      {/* Selected roles — always visible, click the × to remove */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => remove(role)}
              className="inline-flex h-8 select-none items-center gap-1 rounded-[10px] border border-brand bg-brand pl-3 pr-1.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              <span className="min-w-0 truncate">{role}</span>
              <HugeiconsIcon icon={Cancel01Icon} size={16} className="shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-input/30 px-3.5">
        <HugeiconsIcon icon={Search01Icon} size={16} className="shrink-0 text-muted-foreground" />
        <input
          aria-label="Search roles"
          placeholder="Search roles to add…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {save.isPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {searching ? (
        /* Results — directly under the search box so the flow stays connected */
        <div className="overflow-hidden rounded-xl border border-border">
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto p-1">
              {results.map((role) => {
                const creatable = role.toLowerCase() === term.toLowerCase() && !hits.some((h) => h.toLowerCase() === term.toLowerCase());
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => add(role)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={16} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{role}</span>
                    {creatable && <span className="shrink-0 text-xs text-muted-foreground">Add custom</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Quick-add suggestions when not searching */
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pick the roles you're targeting — or search to add your own. The more accurate these are, the better your job matches.
          </p>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => add(role)}
                    className="inline-flex h-8 select-none items-center gap-1 rounded-[10px] border border-border bg-input/30 pl-3 pr-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 truncate">{role}</span>
                    <HugeiconsIcon icon={PlusSignIcon} size={16} className="shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
