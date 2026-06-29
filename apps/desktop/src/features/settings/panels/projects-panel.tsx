import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Edit01Icon, Delete01Icon, FolderLibraryIcon, LinkSquare02Icon, GitForkIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldTitle } from "@/components/ui/field";
import { SkillPicker } from "@/features/settings/components/skill-picker";
import type { ProjectItem, ProjectInput } from "@compass/ipc-contract";
import {
  useProjects,
  useAddProject,
  useUpdateProject,
  useRemoveProject,
} from "@/features/profile/projects-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

const currentYear = new Date().getFullYear();
// Projects/publications are past or ongoing — never future-dated.
const YEARS = Array.from({ length: 50 }, (_, i) => String(currentYear - i));

const ROLES = [
  "Author", "Co-author", "Lead developer", "Maintainer", "Contributor",
  "Owner", "Collaborator", "Designer", "Researcher",
] as const;

function fmtIso(iso: string | null): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mon = m ? MONTHS_SHORT[parseInt(m, 10) - 1] : null;
  return mon ? `${mon} ${y}` : y;
}

function dateRange(item: ProjectItem): string {
  const start = fmtIso(item.startDate);
  const end = item.isCurrent ? "Present" : fmtIso(item.endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  publisher: string;
  publisherImage: string;
  role: string;
  isCurrent: boolean;
  featured: boolean;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  url: string;
  repoUrl: string;
  description: string;
  techStack: string[];
  techInput: string;
}

function blankForm(): FormState {
  return {
    title: "", publisher: "", publisherImage: "", role: "", isCurrent: false, featured: false,
    startMonth: "", startYear: "", endMonth: "", endYear: "",
    url: "", repoUrl: "", description: "", techStack: [], techInput: "",
  };
}

function itemToForm(item: ProjectItem): FormState {
  const parts = (iso: string | null) => (iso ? iso.split("-") : ["", ""]);
  const [sy, sm] = parts(item.startDate);
  const [ey, em] = parts(item.endDate);
  return {
    title: item.title,
    publisher: item.publisher ?? "",
    publisherImage: item.publisherImage ?? "",
    role: item.role ?? "",
    isCurrent: item.isCurrent,
    featured: item.featured,
    startMonth: sm ? String(parseInt(sm, 10)) : "",
    startYear: sy ?? "",
    endMonth: em ? String(parseInt(em, 10)) : "",
    endYear: ey ?? "",
    url: item.url ?? "",
    repoUrl: item.repoUrl ?? "",
    description: item.description ?? "",
    techStack: item.techStack ?? [],
    techInput: "",
  };
}

// ── Publisher autocomplete (daily.dev companies) ───────────────────────────────

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

function PublisherField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [results, setResults] = useState<{ id: string; name: string; image: string }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLinked = !!form.publisherImage;

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

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div className="relative flex items-center">
          {isLinked && (
            <img src={form.publisherImage} alt={form.publisher} className="absolute left-3 h-5 w-5 rounded-full object-contain" />
          )}
          <Input
            className={isLinked ? "pl-10" : ""}
            placeholder="Publisher or organization"
            value={form.publisher}
            autoComplete="off"
            onChange={(e) => {
              setForm((p) => ({ ...p, publisher: e.target.value, publisherImage: "" }));
              search(e.target.value);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => {
                  setForm((p) => ({ ...p, publisher: r.name, publisherImage: r.image }));
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

      {isLinked && (
        <Button type="button" variant="outline" size="sm" className="self-start"
          onClick={() => setForm((p) => ({ ...p, publisherImage: "" }))}>
          Unlink publisher
        </Button>
      )}
    </div>
  );
}

// ── List item ─────────────────────────────────────────────────────────────────

function ProjectListItem({
  item,
  onEdit,
  onRemove,
}: {
  item: ProjectItem;
  onEdit: (item: ProjectItem) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const description = item.description ?? "";
  const techStack = item.techStack ?? [];
  const trimmed = description.length > 200 ? description.slice(0, 200) + "…" : description;

  return (
    <li className="group relative flex gap-3 py-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card">
        {item.publisherImage ? (
          <img src={item.publisherImage} alt={item.publisher ?? item.title} className="h-8 w-8 object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <HugeiconsIcon icon={FolderLibraryIcon} size={20} className="text-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-foreground capitalize">{item.title}</span>
              {item.featured && (
                <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">Featured</span>
              )}
            </div>
            {(item.publisher || item.role) && (
              <p className="text-sm text-muted-foreground capitalize">
                {[item.publisher, item.role].filter(Boolean).join(" · ")}
              </p>
            )}
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

        {dateRange(item) && (
          <p className="mt-1.5 text-sm text-muted-foreground">{dateRange(item)}</p>
        )}

        {description && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed text-muted-foreground">{expanded ? description : trimmed}</p>
            {description.length > 200 && (
              <button type="button" className="mt-0.5 text-[13px] font-medium text-blue hover:underline"
                onClick={() => setExpanded((p) => !p)}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {(item.url || item.repoUrl) && (
          <div className="mt-1 flex flex-wrap items-center gap-4">
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-blue hover:underline">
                <HugeiconsIcon icon={LinkSquare02Icon} size={14} />
                View project
              </a>
            )}
            {item.repoUrl && (
              <a href={item.repoUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-blue hover:underline">
                <HugeiconsIcon icon={GitForkIcon} size={14} />
                Source
              </a>
            )}
          </div>
        )}

        {techStack.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {techStack.slice(0, 6).map((s) => (
              <span key={s} className="rounded-lg border border-border px-2 py-1 text-sm text-muted-foreground">{s}</span>
            ))}
            {techStack.length > 6 && (
              <span className="rounded-lg border border-border px-2 py-1 text-sm text-muted-foreground">+{techStack.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function ProjectFormView({
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

  const addTech = (raw: string) => {
    const tags = raw.split(",").map((s) => s.trim()).filter(Boolean);
    setForm((p) => ({ ...p, techStack: [...new Set([...p.techStack, ...tags])], techInput: "" }));
  };
  const removeTech = (s: string) =>
    setForm((p) => ({ ...p, techStack: p.techStack.filter((x) => x !== s) }));

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border h-fit">
      <h2 className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center border-b border-border bg-background px-4 font-semibold text-base text-foreground">
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="mr-2 flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        {editId ? "Edit Project" : "Add Project"}
        <span className="ml-auto">
          <Button size="sm" onClick={onSave} disabled={saving || !form.title}
            className="bg-white text-black hover:bg-white/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </span>
      </h2>

      <section className="flex flex-col gap-6 overflow-x-hidden p-6 w-full">

        {/* Title */}
        <Field>
          <FieldTitle>Title<span className="text-destructive">*</span></FieldTitle>
          <Input placeholder="Ex: Building Scalable APIs with Go" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>

        {/* Publisher */}
        <Field>
          <FieldTitle>Publisher / organization</FieldTitle>
          <PublisherField form={form} setForm={setForm} />
        </Field>

        {/* Role */}
        <Field>
          <FieldTitle>Your role</FieldTitle>
          <Select value={form.role || ""} onValueChange={(v) => set("role", v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div className="border-t border-border/50" />

        {/* Ongoing */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Ongoing project / publication</p>
            <Switch checked={form.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          </div>
          <p className="text-sm text-muted-foreground">Check if this is currently active or ongoing.</p>
        </div>

        {/* Featured */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Feature this</p>
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
          </div>
          <p className="text-sm text-muted-foreground">Surface this as a highlighted proof point.</p>
        </div>

        {/* Start date */}
        <Field>
          <FieldTitle>Start date</FieldTitle>
          <div className="flex gap-6">
            <Select value={form.startMonth || ""} onValueChange={(v) => set("startMonth", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.startYear || ""} onValueChange={(v) => set("startYear", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
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
                <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.endYear || ""} onValueChange={(v) => set("endYear", v)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Field>
        )}

        <div className="border-t border-border/50" />

        {/* Project URL */}
        <Field>
          <FieldTitle>Project URL</FieldTitle>
          <Input placeholder="Ex: https://example.com/page" value={form.url} onChange={(e) => set("url", e.target.value)} />
        </Field>

        {/* Repo URL */}
        <Field>
          <FieldTitle>Repository URL</FieldTitle>
          <Input placeholder="Ex: https://github.com/you/project" value={form.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} />
        </Field>

        {/* Description */}
        <Field>
          <FieldTitle>Description</FieldTitle>
          <div className="relative">
            <Textarea
              rows={5}
              maxLength={5000}
              placeholder="Summary of the work, focus area, and impact"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="resize-none pb-6"
            />
            <span className="absolute bottom-2.5 right-3.5 text-[11px] text-foreground">{form.description.length}/5000</span>
          </div>
        </Field>

        <div className="border-t border-border/50" />

        {/* Tech stack */}
        <div className="flex flex-col gap-3">
          <FieldTitle>Tech stack</FieldTitle>
          <SkillPicker
            skills={form.techStack}
            input={form.techInput}
            onInput={(v) => setForm((p) => ({ ...p, techInput: v }))}
            onAdd={addTech}
            onRemove={removeTech}
            placeholder="Search technologies"
          />
        </div>

        {/* Delete */}
        {editId && onDelete && (
          <div className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onDelete} className="text-foreground hover:border-destructive hover:text-destructive">
              Delete project
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ProjectsPanel() {
  const { data: items = [], isLoading } = useProjects();
  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const removeProject = useRemoveProject();

  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  const openAdd = () => { setEditId(null); setForm(blankForm()); setFormOpen(true); };
  const openEdit = (item: ProjectItem) => { setEditId(item.id); setForm(itemToForm(item)); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditId(null); };

  const buildInput = (): ProjectInput => {
    const iso = (year: string, month: string) =>
      year ? `${year}-${(month || "1").padStart(2, "0")}-01` : undefined;
    return {
      title: form.title.trim(),
      publisher: form.publisher.trim() || undefined,
      publisherImage: form.publisherImage.trim() || undefined,
      role: form.role.trim() || undefined,
      isCurrent: form.isCurrent,
      featured: form.featured,
      startDate: iso(form.startYear, form.startMonth),
      endDate: form.isCurrent ? undefined : iso(form.endYear, form.endMonth),
      url: form.url.trim() || undefined,
      repoUrl: form.repoUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      techStack: form.techStack.length ? form.techStack : undefined,
    };
  };

  const handleSave = async () => {
    const input = buildInput();
    if (editId) await updateProject.mutateAsync({ id: editId, patch: input });
    else await addProject.mutateAsync(input);
    closeForm();
  };

  const handleDelete = async () => {
    if (!editId) return;
    await removeProject.mutateAsync(editId);
    closeForm();
  };

  const saving = addProject.isPending || updateProject.isPending;

  if (formOpen) {
    return (
      <ProjectFormView
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

  return (
    <main className="flex min-w-0 flex-1 self-start flex-col overflow-hidden rounded-xl border border-border">
      <div className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
        <h2 className="flex-1 text-base font-semibold text-foreground">Projects & Publications</h2>
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
            <p className="text-sm font-medium text-foreground">No projects added yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <ProjectListItem key={item.id} item={item} onEdit={openEdit}
                onRemove={async (id) => { await removeProject.mutateAsync(id); }} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
