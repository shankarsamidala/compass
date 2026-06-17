import { useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Edit01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldTitle } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ExperienceItem, ExperienceEmploymentType, ExperienceLocationType } from "@compass/ipc-contract";
import {
  useExperiences,
  useAddExperience,
  useUpdateExperience,
  useRemoveExperience,
} from "@/features/profile/experience-api";
import { useSuggest } from "@/features/onboarding/use-suggest";
import { SkillPicker } from "@/features/settings/components/skill-picker";
import type { SuggestKind } from "@compass/ipc-contract";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<ExperienceEmploymentType, string> = {
  permanent: "Full-time",
  contract: "Contract",
  c2h: "Contract to Hire",
  internship: "Internship",
  freelance: "Freelance",
};

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 40 }, (_, i) => String(currentYear - i));

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mon = m ? MONTHS_SHORT[parseInt(m, 10) - 1] : null;
  return mon ? `${mon} ${y}` : y;
}

function dateRange(item: ExperienceItem): string {
  const start = fmtDate(item.startDate);
  const end = item.isCurrent ? "Present" : fmtDate(item.endDate);
  if (start && end) return `${start} – ${end}`;
  return start;
}

function faviconUrl(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=128`;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  employmentType: ExperienceEmploymentType | "";
  company: string;
  domain: string;
  linkedImage: string;  // favicon url from autocomplete
  isCurrent: boolean;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  location: string;
  locationType: ExperienceLocationType;
  description: string;
  skills: string[];
  skillInput: string;
}

function blankForm(): FormState {
  return {
    title: "", employmentType: "", company: "", domain: "", linkedImage: "",
    isCurrent: false, startMonth: "", startYear: "", endMonth: "", endYear: "",
    location: "", locationType: "onsite", description: "", skills: [], skillInput: "",
  };
}

function itemToForm(item: ExperienceItem): FormState {
  const parts = (iso: string | null) => iso ? iso.split("-") : ["", ""];
  const [, sm, ] = parts(item.startDate);
  const sy = parts(item.startDate)[0];
  const [, em, ] = parts(item.endDate);
  const ey = parts(item.endDate)[0];
  return {
    title: item.title,
    employmentType: item.employmentType ?? "",
    company: item.company,
    domain: item.domain ?? "",
    linkedImage: item.companyImage ?? "",
    isCurrent: item.isCurrent,
    startMonth: sm ? String(parseInt(sm, 10)) : "",
    startYear: sy ?? "",
    endMonth: em ? String(parseInt(em, 10)) : "",
    endYear: ey ?? "",
    location: item.location ?? "",
    locationType: item.locationType ?? "onsite",
    description: item.description ?? "",
    skills: item.skills ?? [],
    skillInput: "",
  };
}

// ── Company autocomplete ──────────────────────────────────────────────────────

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

function extractDomain(imageUrl: string): string {
  const m = imageUrl.match(/domain=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function CompanyField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [results, setResults] = useState<{ id: string; name: string; image: string }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLinked = !!form.linkedImage;

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: COMPANY_GQL, variables: { query: q, limit: 10, type: "company" } }),
        });
        const json = await res.json();
        const items: { id: string; name: string; image: string }[] = json?.data?.autocompleteCompany ?? [];
        setResults(items);
        setOpen(items.length > 0);
      } catch { /* silent */ }
    }, 300);
  };

  const unlink = () => setForm((p) => ({ ...p, linkedImage: "", domain: "" }));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* Input with optional inline favicon */}
        <div className="relative flex items-center">
          {isLinked && (
            <img src={form.linkedImage} alt={form.company} className="absolute left-3 h-5 w-5 rounded-full object-contain" />
          )}
          <Input
            className={isLinked ? "pl-10" : ""}
            placeholder="Company or organization*"
            value={form.company}
            autoComplete="off"
            onChange={(e) => {
              setForm((p) => ({ ...p, company: e.target.value, linkedImage: "", domain: "" }));
              search(e.target.value);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => {
                  const domain = extractDomain(r.image);
                  setForm((p) => ({ ...p, company: r.name, domain, linkedImage: r.image }));
                  setOpen(false);
                }}
              >
                <img src={r.image} alt={r.name} className="h-5 w-5 shrink-0 rounded object-contain" />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unlink button */}
      {isLinked && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={unlink}>
          Unlink company
        </Button>
      )}
    </div>
  );
}

// ── Suggest field (provider-backed typeahead, free text allowed) ───────────────

function SuggestField({
  value,
  onChange,
  kind,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  kind: SuggestKind;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { items } = useSuggest(kind, value);
  const live = items.filter((s) => s.toLowerCase() !== value.trim().toLowerCase());

  return (
    <div className="relative">
      <Input
        className={className}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && live.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-background shadow-lg">
          {live.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List item ─────────────────────────────────────────────────────────────────

function ExperienceListItem({
  item,
  onEdit,
  onRemove,
}: {
  item: ExperienceItem;
  onEdit: (item: ExperienceItem) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const description = item.description ?? "";
  const trimmed = description.length > 200 ? description.slice(0, 200) + "…" : description;
  const logo = item.companyImage || (item.domain ? faviconUrl(item.domain) : null);

  return (
    <li className="group relative flex gap-3 py-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card">
        {logo ? (
          <img src={logo} alt={item.company} className="h-8 w-8 object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span className="text-xs font-bold text-foreground">{item.company.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-bold text-white capitalize">{item.title}</span>
              {item.isCurrent && (
                <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">Current</span>
              )}
            </div>
            <p className="text-xs text-white capitalize">{item.company}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Edit" onClick={() => onEdit(item)}
              className="flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground">
              <HugeiconsIcon icon={Edit01Icon} size={16} />
            </button>
            <button type="button" aria-label="Delete" onClick={() => onRemove(item.id)}
              className="flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-destructive/10 hover:text-destructive">
              <HugeiconsIcon icon={Delete01Icon} size={16} />
            </button>
          </div>
        </div>

        {(item.startDate || item.location) && (
          <p className="mt-1.5 text-xs text-foreground">
            {[dateRange(item), item.location].filter(Boolean).join(" · ")}
          </p>
        )}


        {description && (
          <div className="mt-2">
            <p className="text-xs leading-relaxed text-foreground">{expanded ? description : trimmed}</p>
            {description.length > 200 && (
              <button type="button" className="mt-0.5 text-[13px] font-medium text-blue hover:underline"
                onClick={() => setExpanded((p) => !p)}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {item.skills && item.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.skills.slice(0, 6).map((s) => (
              <span key={s} className="rounded-lg border border-border px-2 py-1 text-xs text-foreground">{s}</span>
            ))}
            {item.skills.length > 6 && (
              <span className="rounded-lg border border-border px-2 py-1 text-xs text-foreground">+{item.skills.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function ExperienceForm({
  editId,
  form,
  setForm,
  saving,
  onSave,
  onClose,
  onDelete,
}: {
  editId: string | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const addSkill = (raw: string) => {
    const tags = raw.split(",").map((s) => s.trim()).filter(Boolean);
    setForm((p) => ({ ...p, skills: [...new Set([...p.skills, ...tags])], skillInput: "" }));
  };

  const removeSkill = (s: string) =>
    setForm((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border h-fit">
      {/* Sticky header */}
      <h2 className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center border-b border-border bg-background px-4 font-bold text-base text-white">
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="mr-2 flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground"
        >
          {/* chevron left */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        {editId ? "Edit Work Experience" : "Add Work Experience"}
        <span className="ml-auto">
          <Button size="sm" onClick={onSave} disabled={saving || !form.title || !form.company}
            className="bg-white text-black hover:bg-white/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </span>
      </h2>

      {/* Body */}
      <section className="flex flex-col gap-6 overflow-x-hidden p-6 w-full">

        {/* Job title */}
        <Field>
          <FieldTitle>Job Title<span className="text-destructive">*</span></FieldTitle>
          <SuggestField kind="roles" placeholder="Ex: Senior Frontend Engineer" value={form.title} onChange={(v) => set("title", v)} />
        </Field>

        {/* Employment type */}
        <Field>
          <FieldTitle>Employment Type</FieldTitle>
          <Select value={form.employmentType || ""} onValueChange={(v) => set("employmentType", v as ExperienceEmploymentType)}>
            <SelectTrigger className="h-9 w-full rounded-4xl">
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Company */}
        <Field>
          <FieldTitle>Company or organization<span className="text-destructive">*</span></FieldTitle>
          <CompanyField form={form} setForm={setForm} />
        </Field>

        {/* Domain */}
        <Field>
          <FieldTitle>Company domain</FieldTitle>
          <Input placeholder="Ex: company.com" value={form.domain} onChange={(e) => set("domain", e.target.value)} />
        </Field>

        <div className="border-t border-border/50" />

        {/* Current position */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">Current position</p>
            <Switch checked={form.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          </div>
          <p className="text-xs text-foreground">Check if this is your current role</p>
        </div>

        {/* Start date */}
        <Field>
          <FieldTitle>Start date<span className="text-destructive">*</span></FieldTitle>
          <div className="flex gap-6">
            <Select value={form.startMonth || ""} onValueChange={(v) => set("startMonth", v)}>
              <SelectTrigger className="h-9 flex-1 rounded-4xl"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.startYear || ""} onValueChange={(v) => set("startYear", v)}>
              <SelectTrigger className="h-9 flex-1 rounded-4xl"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Field>

        {!form.isCurrent && (
          <Field>
            <FieldTitle>End date</FieldTitle>
            <div className="flex gap-6">
              <Select value={form.endMonth || ""} onValueChange={(v) => set("endMonth", v)}>
                <SelectTrigger className="h-9 flex-1 rounded-4xl"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.endYear || ""} onValueChange={(v) => set("endYear", v)}>
                <SelectTrigger className="h-9 flex-1 rounded-4xl"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Field>
        )}

        <div className="border-t border-border/50" />

        {/* Location */}
        <Field>
          <FieldTitle>Location</FieldTitle>
          <SuggestField kind="locations" placeholder="Location" value={form.location} onChange={(v) => set("location", v)} />
          <div className="flex flex-row flex-wrap items-center gap-1">
            {(["remote", "hybrid", "onsite"] as const).map((t) => (
              <label key={t} className={cn(
                "inline-flex cursor-pointer select-none items-center gap-2 rounded-[10px] px-2 py-1 text-xs font-medium transition-colors",
                form.locationType === t ? "text-white" : "text-foreground hover:text-white",
              )}>
                <span className={cn(
                  "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                  form.locationType === t ? "border-brand" : "border-border",
                )}>
                  {form.locationType === t && <span className="size-2 rounded-full bg-brand" />}
                </span>
                <input type="radio" className="sr-only" checked={form.locationType === t}
                  onChange={() => set("locationType", t)} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </Field>

        {/* Description */}
        <Field>
          <FieldTitle>Description</FieldTitle>
          <div className="relative">
            <Textarea
              rows={5}
              maxLength={5000}
              placeholder="Key technologies, projects, and achievements"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="resize-none pb-6"
            />
            <span className="absolute bottom-2.5 right-3.5 text-[11px] text-foreground">{form.description.length}/5000</span>
          </div>
        </Field>

        {/* Skills */}
        <div className="flex flex-col gap-3">
          <FieldTitle>Skills</FieldTitle>
          <SkillPicker
            skills={form.skills}
            input={form.skillInput}
            onInput={(v) => setForm((p) => ({ ...p, skillInput: v }))}
            onAdd={addSkill}
            onRemove={removeSkill}
          />
          <p className="flex items-center gap-1 text-xs text-foreground">
            Tap a suggestion to add it, or type and press Enter. Use commas for multiple.
          </p>
        </div>

        {/* Delete */}
        {editId && onDelete && (
          <div className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onDelete} className="text-foreground hover:border-destructive hover:text-destructive">
              Delete work experience
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function WorkExperiencePanel() {
  const { data: items = [], isLoading } = useExperiences();
  const addExp = useAddExperience();
  const updateExp = useUpdateExperience();
  const removeExp = useRemoveExperience();

  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  const openAdd = () => { setEditId(null); setForm(blankForm()); setFormOpen(true); };
  const openEdit = (item: ExperienceItem) => { setEditId(item.id); setForm(itemToForm(item)); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditId(null); };

  const buildInput = () => {
    const pad = (m: string) => m.padStart(2, "0");
    const startDate = form.startYear && form.startMonth
      ? `${form.startYear}-${pad(form.startMonth)}-01` : undefined;
    const endDate = !form.isCurrent && form.endYear && form.endMonth
      ? `${form.endYear}-${pad(form.endMonth)}-01` : undefined;
    return {
      company: form.company.trim(),
      domain: form.domain.trim() || undefined,
      companyImage: form.linkedImage.trim() || undefined,
      title: form.title.trim(),
      location: form.location.trim() || undefined,
      locationType: form.locationType,
      employmentType: (form.employmentType || undefined) as ExperienceEmploymentType | undefined,
      startDate,
      endDate,
      isCurrent: form.isCurrent,
      description: form.description.trim() || undefined,
      skills: form.skills.length ? form.skills : undefined,
    };
  };

  const handleSave = async () => {
    const input = buildInput();
    if (editId) await updateExp.mutateAsync({ id: editId, patch: input });
    else await addExp.mutateAsync(input);
    closeForm();
  };

  const handleDelete = async () => {
    if (!editId) return;
    await removeExp.mutateAsync(editId);
    closeForm();
  };

  const saving = addExp.isPending || updateExp.isPending;

  // ── Form view (full width) ────────────────────────────────────────────────
  if (formOpen) {
    return (
      <ExperienceForm
        editId={editId}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={closeForm}
        onDelete={editId ? handleDelete : undefined}
      />
    );
  }

  // ── List view (full width) ────────────────────────────────────────────────
  return (
    <main className="flex min-w-0 flex-1 self-start flex-col overflow-hidden rounded-xl border border-border">
      <div className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
        <h2 className="flex-1 text-base font-bold text-white">Work Experience</h2>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <HugeiconsIcon icon={Add01Icon} size={16} className="mr-1.5" />
          Add
        </Button>
      </div>

      <section className="flex-1 overflow-y-auto px-6">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-6">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No work experience added yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <ExperienceListItem key={item.id} item={item} onEdit={openEdit}
                onRemove={async (id) => { await removeExp.mutateAsync(id); }} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
