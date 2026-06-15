import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { JobLinkIcon, RocketIcon, File01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/ipc";
import type { ScanSource, MatchFloor } from "@compass/ipc-contract";
import { useSettings, useUpdateSettings } from "../api";
import { useProfilePrefs, useUpdateProfile } from "../profile-api";
import { TargetRolesPicker } from "../components/target-roles-picker";
import { PrefSection, PrefDivider, RadioCard } from "../components/pref-controls";

const EMPLOYMENT = [
  { value: "permanent", label: "Full-time" },
  { value: "contract", label: "Contract / Freelance" },
  { value: "c2h", label: "Contract-to-hire" },
];
const MATCH_FLOORS: { value: MatchFloor; label: string; hint: string }[] = [
  { value: "all", label: "Show all", hint: "Every matched role, weak to strong." },
  { value: "fair", label: "Fair & up", hint: "Hide weak matches." },
  { value: "strong", label: "Strong only", hint: "Only the best-fit roles." },
];
const BOARDS: { id: ScanSource; name: string; desc: string; available: boolean }[] = [
  { id: "naukri", name: "Naukri", desc: "India's largest job board. Scraped from your own IP.", available: true },
  { id: "linkedin", name: "LinkedIn", desc: "Roles from your network and beyond.", available: false },
  { id: "indeed", name: "Indeed", desc: "Broad aggregator across companies.", available: false },
  { id: "greenhouse", name: "Greenhouse", desc: "Direct from company Greenhouse boards.", available: false },
  { id: "lever", name: "Lever", desc: "Direct from company Lever boards.", available: false },
];

export function JobSearchPanel() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: prefs, isLoading } = useProfilePrefs();
  const updateProfile = useUpdateProfile();

  // Dummy (no backend yet).
  const [careerMode, setCareerMode] = useState(true);
  const [status, setStatus] = useState<"looking" | "open">("open");

  if (isLoading || !prefs || !settings) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-card" />
        <div className="h-40 animate-pulse rounded-xl bg-card" />
      </div>
    );
  }

  const scan = settings.scan;
  const toggleBoard = (id: ScanSource, on: boolean) =>
    updateSettings.mutate({ scan: { ...scan, sources: on ? [...new Set([...scan.sources, id])] : scan.sources.filter((s) => s !== id) } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Job preferences</h1>

      {/* Career mode (dummy) */}
      <div className="flex flex-row gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-base"><strong>Career mode</strong> <span className="text-muted-foreground">(beta)</span></p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            When on, Compass works as your trusted talent agent — surfacing real roles for your approval. Nothing is shared without your say-so.
          </p>
        </div>
        <Switch checked={careerMode} onCheckedChange={setCareerMode} />
      </div>

      {/* Status (dummy) */}
      <div className="flex flex-col gap-3">
        <RadioCard
          icon={JobLinkIcon}
          title="Actively looking"
          description="Ready to make a move and exploring new opportunities."
          checked={status === "looking"}
          onSelect={() => setStatus("looking")}
        />
        <RadioCard
          icon={RocketIcon}
          title="Open to offers"
          description="Happy where I am, but open to something exceptional."
          checked={status === "open"}
          onSelect={() => setStatus("open")}
        />
      </div>

      <PrefDivider />

      {/* Supercharge — uploads */}
      <PrefSection
        title="Supercharge your match quality"
        description="The more we understand your background and current terms, the better we filter out noise and surface only roles worth your attention."
      >
        <div className="flex flex-row gap-6">
          <CvUpload />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm font-bold text-foreground">Upload Employment Agreement</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sharing your current agreement lets us guarantee any surfaced role beats your existing terms. 100% confidential.
            </p>
            <Button size="sm" variant="outline" disabled className="mr-auto">Upload PDF</Button>
          </div>
        </div>
      </PrefSection>

      <PrefDivider />

      {/* Must-haves */}
      <PrefSection title="Your must-haves">
        <div className="flex flex-col gap-6">
          {/* Target roles */}
          <PrefSection title="What kind of role are you looking for?">
            <TargetRolesPicker />
          </PrefSection>

          {/* Row 1 — Employment type + Salary */}
          <div className="grid grid-cols-2 gap-4">
            <PrefSection title="Employment type" description="Select the type of role you'd consider.">
              <Select
                value={prefs.employmentType ?? "permanent"}
                onValueChange={(v) => updateProfile.mutate({ employmentType: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PrefSection>

            <PrefSection title="Salary expectations" description="Give a minimum so we only surface roles that meet your requirements.">
              <SalaryField initial={prefs.expectedCtc} onSave={(v) => updateProfile.mutate({ expectedCtc: v })} />
            </PrefSection>
          </div>

          {/* Row 2 — Location preferences + Minimum match */}
          <div className="grid grid-cols-2 gap-4">
            <PrefSection title="Location preferences" description="Tell us where you want to work from.">
              <Select
                value={prefs.openToRemote ? (prefs.openToRelocate ? "relocate" : "remote") : "onsite"}
                onValueChange={(v) => {
                  if (v === "remote") updateProfile.mutate({ openToRemote: true, openToRelocate: false });
                  else if (v === "relocate") updateProfile.mutate({ openToRemote: true, openToRelocate: true });
                  else updateProfile.mutate({ openToRemote: false, openToRelocate: false });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">On-site only</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="relocate">Remote & open to relocate</SelectItem>
                </SelectContent>
              </Select>
            </PrefSection>

            <PrefSection title="Minimum match" description="Filter your feed by how well a role fits you.">
              <Select
                value={scan.minMatch}
                onValueChange={(v) => updateSettings.mutate({ scan: { ...scan, minMatch: v as MatchFloor } })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_FLOORS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PrefSection>
          </div>
        </div>
      </PrefSection>

      <PrefDivider />

      {/* Job boards */}
      <PrefSection title="Job boards" description="Where Compass scans for roles. Scraping runs locally, from your machine.">
        <div className="divide-y divide-border">
          {BOARDS.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-foreground">{b.name}</span>
                  {!b.available && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Soon</span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{b.desc}</div>
              </div>
              <Switch checked={scan.sources.includes(b.id)} disabled={!b.available} onCheckedChange={(v) => toggleBoard(b.id, v)} />
            </div>
          ))}
        </div>
      </PrefSection>
    </div>
  );
}

/** Salary minimum — debounced save on blur. */
function SalaryField({ initial, onSave }: { initial: number | null; onSave: (v: number) => void }) {
  const [val, setVal] = useState(initial != null ? String(initial) : "");
  useEffect(() => {
    setVal(initial != null ? String(initial) : "");
  }, [initial]);
  return (
    <div className="flex h-9 w-full overflow-hidden rounded-4xl border border-input bg-input/30 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <input
        className="h-full flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground"
        inputMode="numeric"
        placeholder="Min CTC"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          const n = Number(val);
          if (val.trim() && Number.isFinite(n) && n !== initial) onSave(n);
        }}
      />
      <span className="flex items-center pr-3 text-muted-foreground">LPA</span>
    </div>
  );
}

/** CV upload — reuses local document extraction (UI-only persistence for now). */
function CvUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (f: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const res = await api.document.extractText(f.name, bytes);
      if (res.ok) setName(f.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="text-sm font-bold text-foreground">Upload CV</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your CV helps us understand your skills and career path. Never shared unless you say yes to a role.
      </p>
      {name && (
        <p className="flex items-center gap-1 text-xs text-foreground">
          <HugeiconsIcon icon={File01Icon} size={18} /> {name}
          <button
            type="button"
            aria-label="Remove CV"
            onClick={() => setName(null)}
            className="ml-1 flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </p>
      )}
      <input
        ref={ref}
        type="file"
        hidden
        accept=".pdf,.doc,.docx"
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
      <Button size="sm" variant="outline" className="mr-auto" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Reading…" : "Upload PDF"}
      </Button>
    </div>
  );
}
