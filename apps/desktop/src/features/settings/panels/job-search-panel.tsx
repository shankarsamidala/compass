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
import { PrefDivider, RadioCard, RadioPill, CheckChip } from "../components/pref-controls";
import { JobFunctionMultiSelect } from "../components/job-function-multiselect";

const MATCH_FLOORS: { value: MatchFloor; label: string }[] = [
  { value: "all", label: "Show all" },
  { value: "fair", label: "Fair & up" },
  { value: "strong", label: "Strong only" },
];
const BOARDS: { id: ScanSource; name: string; desc: string; available: boolean }[] = [
  { id: "naukri", name: "Naukri", desc: "India's largest job board. Scraped from your own IP.", available: true },
  { id: "hirist", name: "Hirist", desc: "India IT/dev roles. Scraped from your own IP.", available: true },
  { id: "instahyre", name: "Instahyre", desc: "Curated tech roles. Uses your skills + job function. No salary/date.", available: true },
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

  const [careerMode, setCareerMode] = useState(true);
  const [status, setStatus] = useState<"looking" | "open">("open");
  // Employment type: multi-select (dummy, no API multi-type support yet)
  const [empTypes, setEmpTypes] = useState({ fulltime: true, parttime: false, contract: true, internship: false });
  // Location work modes
  const [workModes, setWorkModes] = useState({ remote: true, hybrid: true, onsite: false });
  // Tech stack
  const [techStack, setTechStack] = useState<"auto" | "manual">("auto");

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

      {/* Career mode */}
      <span className="flex flex-row gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-base text-white font-bold">Career mode <span className="text-foreground text-xs font-normal">(beta)</span></p>
          <p className="text-xs leading-relaxed text-foreground">
            When this is on, Compass works as your trusted talent agent, introducing you to real roles for your approval. Nothing is shared without your say-so. We'll only reach out when a role is worth your time. No spam. No pressure. Your career, your terms.
          </p>
        </div>
        <Switch checked={careerMode} onCheckedChange={setCareerMode} />
      </span>

      {/* Status cards */}
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

      {/* Supercharge */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold text-white">Supercharge your match quality</p>
          <p className="text-xs leading-relaxed text-foreground">
            The more we understand your background and current terms, the better we can filter out noise and surface only roles that are truly worth your attention.
          </p>
        </div>
        <div className="flex flex-row gap-6">
          <CvUpload />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm font-medium text-white">Upload Employment Agreement</p>
            <p className="text-xs leading-relaxed text-foreground">
              Sharing your current agreement lets us guarantee that any role we surface will exceed your existing terms. 100% confidential — only used to protect your time and negotiating power.
            </p>
            <Button size="sm" variant="outline" disabled className="mr-auto mb-4 font-normal">Upload PDF</Button>
          </div>
        </div>
      </div>

      <PrefDivider />

      {/* Must-haves */}
      <div className="flex flex-col gap-6">
        <p className="text-base font-bold text-white">Your must-haves</p>

        {/* Target role text + role type */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">What kind of role are you looking for?</p>
          <TargetRolesPicker />
          <div className="mt-1 flex flex-row flex-wrap items-center gap-1">
            <RadioPill label="Auto (Recommended)" checked={techStack === "auto"} onSelect={() => setTechStack("auto")} />
            <RadioPill label="IC roles" checked={false} onSelect={() => {}} />
            <RadioPill label="Managerial roles" checked={false} onSelect={() => {}} />
          </div>
        </div>

        {/* Employment type */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">Employment type</p>
          <p className="text-xs text-foreground">Select all that apply to the roles you'd consider.</p>
          <div className="flex flex-wrap">
            <CheckChip label="Full-time" checked={empTypes.fulltime} onChange={(v) => setEmpTypes((p) => ({ ...p, fulltime: v }))} />
            <CheckChip label="Part-time" checked={empTypes.parttime} onChange={(v) => setEmpTypes((p) => ({ ...p, parttime: v }))} />
            <CheckChip label="Contract / Freelance" checked={empTypes.contract} onChange={(v) => setEmpTypes((p) => ({ ...p, contract: v }))} />
            <CheckChip label="Internship" checked={empTypes.internship} onChange={(v) => setEmpTypes((p) => ({ ...p, internship: v }))} />
          </div>
        </div>

        {/* Salary */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">Salary expectations</p>
          <p className="text-xs text-foreground">Give a minimum so we only surface roles that meet your requirements.</p>
          <div className="flex flex-row items-center gap-3">
            <SalaryField initial={prefs.expectedCtc} onSave={(v) => updateProfile.mutate({ expectedCtc: v })} />
            <Select defaultValue="annually">
              <SelectTrigger className="w-36 h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">Location preferences</p>
          <p className="text-xs text-foreground">Tell us where you want to work from.</p>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-white">Location</p>
            <LocationField initial={prefs.location} onSave={(v) => updateProfile.mutate({ location: v })} />
          </div>
          <div className="flex flex-wrap">
            <CheckChip
              label="Remote"
              checked={workModes.remote}
              onChange={(v) => {
                setWorkModes((p) => ({ ...p, remote: v }));
                updateProfile.mutate({ openToRemote: v });
              }}
            />
            <CheckChip label="Hybrid" checked={workModes.hybrid} onChange={(v) => setWorkModes((p) => ({ ...p, hybrid: v }))} />
            <CheckChip label="On-site" checked={workModes.onsite} onChange={(v) => setWorkModes((p) => ({ ...p, onsite: v }))} />
          </div>
        </div>

        {/* Preferred tech stack */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">Preferred tech stack</p>
          <p className="text-xs text-foreground">Define the tools, technologies, and languages you want in your next role.</p>
          <div className="flex flex-row flex-wrap items-center gap-1 mt-1">
            <RadioPill label="Copy from my profile (Recommended)" checked={techStack === "auto"} onSelect={() => setTechStack("auto")} />
            <RadioPill label="Select manually" checked={techStack === "manual"} onSelect={() => setTechStack("manual")} />
          </div>
        </div>
      </div>

      <PrefDivider />

      {/* Minimum match */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-white">Minimum match</p>
        <p className="text-xs text-foreground">Filter your feed by how well a role fits you.</p>
        <Select
          value={scan.minMatch}
          onValueChange={(v) => updateSettings.mutate({ scan: { ...scan, minMatch: v as MatchFloor } })}
        >
          <SelectTrigger className="w-48 h-10 rounded-xl">
            <SelectValue placeholder="Select threshold" />
          </SelectTrigger>
          <SelectContent>
            {MATCH_FLOORS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PrefDivider />

      {/* Job boards */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-white">Job boards</p>
          <p className="text-xs text-foreground">Where Compass scans for roles. Scraping runs locally, from your machine.</p>
        </div>
        <div className="divide-y divide-border">
          {BOARDS.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{b.name}</span>
                  {!b.available && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">Soon</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-foreground">{b.desc}</div>
              </div>
              <Switch checked={scan.sources.includes(b.id)} disabled={!b.available} onCheckedChange={(v) => toggleBoard(b.id, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Instahyre job functions — only relevant when Instahyre is an enabled board */}
      {scan.sources.includes("instahyre") && (
        <>
          <PrefDivider />
          <InstahyreJobFunctions
            selected={prefs.instahyreJobFunctions}
            onSave={(ids) => updateProfile.mutate({ instahyreJobFunctions: ids })}
          />
        </>
      )}
    </div>
  );
}

/**
 * Instahyre-specific picker: which job functions to search. Instahyre has no free-text
 * keyword — it filters by skills (from your profile) plus these job_function codes.
 * Persists to the profile so the user-side Instahyre adapter can read them at scan time.
 */
function InstahyreJobFunctions({ selected, onSave }: { selected: number[]; onSave: (ids: number[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-white">Instahyre job functions</p>
      <p className="text-xs text-foreground">
        Instahyre has no keyword search — it matches on your skills plus the job functions you pick here.
        Leave empty to search across all functions.
      </p>
      <JobFunctionMultiSelect value={selected} onChange={onSave} />
    </div>
  );
}

function SalaryField({ initial, onSave }: { initial: number | null; onSave: (v: number) => void }) {
  const [val, setVal] = useState(initial != null ? String(initial) : "");
  useEffect(() => { setVal(initial != null ? String(initial) : ""); }, [initial]);
  return (
    <div className="flex h-10 w-40 overflow-hidden rounded-xl border border-input bg-input/30 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <input
        className="h-full flex-1 bg-transparent px-3 outline-none placeholder:text-foreground"
        inputMode="numeric"
        placeholder="Min amount"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          const n = Number(val);
          if (val.trim() && Number.isFinite(n) && n !== initial) onSave(n);
        }}
      />
    </div>
  );
}

function LocationField({ initial, onSave }: { initial: string | null; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initial ?? "");
  useEffect(() => { setVal(initial ?? ""); }, [initial]);
  return (
    <div className="flex h-10 overflow-hidden rounded-xl border border-input bg-input/30 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <input
        className="h-full flex-1 bg-transparent px-3 outline-none placeholder:text-foreground"
        placeholder="Location"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== (initial ?? "")) onSave(val); }}
      />
    </div>
  );
}

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
      <p className="text-sm font-medium text-white">Upload CV</p>
      <p className="text-xs leading-relaxed text-foreground">
        Your CV helps us understand your skills, experience, and career path so we can match you to jobs that actually make sense. Never shared unless you explicitly say yes to a role.
      </p>
      {name && (
        <p className="flex items-center gap-1 text-xs text-foreground">
          <HugeiconsIcon icon={File01Icon} size={18} />
          {name}
          <button
            type="button"
            aria-label="Remove CV"
            onClick={() => setName(null)}
            className="ml-1 flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </p>
      )}
      <input ref={ref} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      <Button size="sm" variant="outline" className="mb-4 mr-auto font-normal" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Reading…" : "Upload PDF"}
      </Button>
    </div>
  );
}
