import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Edit01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldTitle } from "@/components/ui/field";
import type { EducationItem, EducationInput } from "@compass/ipc-contract";
import {
  useEducation,
  useAddEducation,
  useUpdateEducation,
  useRemoveEducation,
} from "@/features/profile/education-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => String(currentYear + 5 - i));

// Education level — same set as the onboarding "highest qualification" dropdown.
const EDUCATION_LEVELS = ["10th", "12th / Intermediate", "Diploma", "Bachelor's", "Master's", "PhD"] as const;

// School levels have no specialization (no degree / field of study).
const SCHOOL_LEVELS = new Set<string>(["10th", "12th / Intermediate"]);
const isSchoolLevel = (level: string) => SCHOOL_LEVELS.has(level);

// Onboarding writes level as a backend code; settings writes the display label.
// Normalize legacy codes back to a label so dedup recognizes onboarding rows too.
const LEVEL_CODE_TO_LABEL: Record<string, string> = {
  ssc_x: "10th",
  twelfth: "12th / Intermediate",
  bachelor_diploma: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
};
const normalizeLevel = (level: string | null | undefined): string =>
  level ? LEVEL_CODE_TO_LABEL[level] ?? level : "";

function fmtDate(year: number | null, month: number | null): string {
  if (!year) return "";
  const mon = month ? MONTHS_SHORT[month - 1] : null;
  return mon ? `${mon} ${year}` : String(year);
}

function dateRange(item: EducationItem): string {
  const start = fmtDate(item.startYear, item.startMonth);
  const end = item.isCurrent ? "Present" : fmtDate(item.endYear, item.endMonth);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

// ── Form state ────────────────────────────────────────────────────────────────

type GradeType = "" | "cgpa" | "percentage" | "grade";

const GRADE_TYPES: { value: Exclude<GradeType, "">; label: string }[] = [
  { value: "cgpa", label: "CGPA" },
  { value: "percentage", label: "Percentage" },
  { value: "grade", label: "Grade" },
];

interface FormState {
  level: string;
  institution: string;
  degree: string;
  field: string;
  isCurrent: boolean;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  gradeType: GradeType;
  gradeValue: string;
}

function blankForm(): FormState {
  return {
    level: "", institution: "", degree: "", field: "", isCurrent: false,
    startMonth: "", startYear: "", endMonth: "", endYear: "",
    gradeType: "", gradeValue: "",
  };
}

function itemToForm(item: EducationItem): FormState {
  const gradeType: GradeType =
    item.cgpa != null ? "cgpa" : item.percentage != null ? "percentage" : item.grade ? "grade" : "";
  const gradeValue =
    gradeType === "cgpa" ? (item.cgpa ?? "") :
    gradeType === "percentage" ? (item.percentage ?? "") :
    gradeType === "grade" ? (item.grade ?? "") : "";
  return {
    level: normalizeLevel(item.level),
    institution: item.institution,
    degree: item.degree ?? "",
    field: item.field ?? "",
    isCurrent: item.isCurrent,
    startMonth: item.startMonth ? String(item.startMonth) : "",
    startYear: item.startYear ? String(item.startYear) : "",
    endMonth: item.endMonth ? String(item.endMonth) : "",
    endYear: item.endYear ? String(item.endYear) : "",
    gradeType,
    gradeValue,
  };
}

function gradeLabel(item: EducationItem): string {
  if (item.cgpa != null) return `CGPA: ${item.cgpa}`;
  if (item.percentage != null) return `${item.percentage}%`;
  if (item.grade) return `Grade: ${item.grade}`;
  return "";
}

// ── List item ─────────────────────────────────────────────────────────────────

function EducationListItem({
  item,
  onEdit,
  onRemove,
}: {
  item: EducationItem;
  onEdit: (item: EducationItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="group relative flex gap-3 py-5">
      <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card">
        <img
          src="https://media.daily.dev/image/upload/s--yc7EcfBs--/f_auto,q_auto/v1/public/organization_fallback"
          alt={item.institution}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-foreground capitalize">{item.institution}</span>
              {normalizeLevel(item.level) && (
                <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{normalizeLevel(item.level)}</span>
              )}
              {item.isCurrent && (
                <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">Current</span>
              )}
            </div>
            {item.field && <p className="text-sm text-muted-foreground capitalize">{item.field}</p>}
            {(item.degree || gradeLabel(item)) && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="capitalize">{item.degree}</span>
                {item.degree && gradeLabel(item) && " · "}
                {gradeLabel(item)}
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
          <p className="mt-1 text-sm text-muted-foreground">{dateRange(item)}</p>
        )}
      </div>
    </li>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function EducationFormView({
  editId,
  form,
  setForm,
  levelOptions = [],
  saving,
  onSave,
  onClose,
  onDelete,
}: {
  editId: string | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** Levels still available to pick (taken ones removed, current selection kept). */
  levelOptions: string[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const schoolLevel = isSchoolLevel(form.level);

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border h-fit">
      {/* Sticky header */}
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
        {editId ? "Edit Education" : "Add Education"}
        <span className="ml-auto">
          <Button size="sm" onClick={onSave} disabled={saving || !form.level || !form.institution}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </span>
      </h2>

      {/* Body */}
      <section className="flex flex-col gap-6 overflow-x-hidden p-6 w-full">

        {/* Level */}
        <Field>
          <FieldTitle>Level<span className="text-destructive">*</span></FieldTitle>
          <Select
            value={form.level || ""}
            onValueChange={(v) =>
              // Switching to a school level drops specialization fields it doesn't use.
              setForm((p) => ({
                ...p,
                level: v,
                ...(isSchoolLevel(v) ? { degree: "", field: "" } : {}),
              }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              {levelOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        {/* Institution */}
        <Field>
          <FieldTitle>School or institution<span className="text-destructive">*</span></FieldTitle>
          <Input placeholder="Ex: Stanford University" value={form.institution} onChange={(e) => set("institution", e.target.value)} />
        </Field>

        {/* Degree + Field of study — specializations don't apply to 10th / 12th. */}
        {!schoolLevel && (
          <>
            <Field>
              <FieldTitle>Degree</FieldTitle>
              <Input placeholder="Ex: Bachelor of Science" value={form.degree} onChange={(e) => set("degree", e.target.value)} />
            </Field>

            <Field>
              <FieldTitle>Field of study</FieldTitle>
              <Input placeholder="Ex: Computer Science" value={form.field} onChange={(e) => set("field", e.target.value)} />
            </Field>
          </>
        )}

        <div className="border-t border-border/50" />

        {/* Currently studying */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Currently studying here</p>
            <Switch checked={form.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          </div>
          <p className="text-sm text-muted-foreground">Check if you're still enrolled</p>
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
            <FieldTitle>End date (or expected)</FieldTitle>
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

        {/* Grade — type + value */}
        <Field>
          <FieldTitle>Grade</FieldTitle>
          <div className="flex gap-6">
            <Select
              value={form.gradeType || ""}
              onValueChange={(v) => setForm((p) => ({ ...p, gradeType: v as GradeType, gradeValue: "" }))}
            >
              <SelectTrigger className="flex-1"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {GRADE_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1">
              <Input
                disabled={!form.gradeType}
                type={form.gradeType === "grade" ? "text" : "number"}
                inputMode={form.gradeType === "grade" ? undefined : "decimal"}
                placeholder={
                  form.gradeType === "cgpa" ? "Ex: 8.5" :
                  form.gradeType === "percentage" ? "Ex: 85" :
                  form.gradeType === "grade" ? "Ex: First Class" : "Value"
                }
                value={form.gradeValue}
                onChange={(e) => set("gradeValue", e.target.value)}
              />
            </div>
          </div>
        </Field>

        {/* Delete */}
        {editId && onDelete && (
          <div className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onDelete} className="text-foreground hover:border-destructive hover:text-destructive">
              Delete education
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function EducationPanel() {
  const { data: items = [], isLoading } = useEducation();
  const addEdu = useAddEducation();
  const updateEdu = useUpdateEducation();
  const removeEdu = useRemoveEducation();

  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  const openAdd = () => { setEditId(null); setForm(blankForm()); setFormOpen(true); };
  const openEdit = (item: EducationItem) => { setEditId(item.id); setForm(itemToForm(item)); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditId(null); };

  // Levels already used by other entries are removed from the dropdown; the entry
  // being edited keeps its own level so it stays selectable.
  const takenLevels = new Set(
    items.filter((it) => it.id !== editId).map((it) => normalizeLevel(it.level)).filter(Boolean),
  );
  const levelOptions = EDUCATION_LEVELS.filter(
    (l) => !takenLevels.has(l) || l === form.level,
  );

  const buildInput = (): EducationInput => {
    const gv = form.gradeValue.trim();
    const school = isSchoolLevel(form.level);
    return {
      level: form.level || null,
      institution: form.institution.trim(),
      degree: school ? undefined : form.degree.trim() || undefined,
      field: school ? undefined : form.field.trim() || undefined,
      startYear: form.startYear ? Number(form.startYear) : undefined,
      startMonth: form.startMonth ? Number(form.startMonth) : undefined,
      endYear: !form.isCurrent && form.endYear ? Number(form.endYear) : undefined,
      endMonth: !form.isCurrent && form.endMonth ? Number(form.endMonth) : undefined,
      isCurrent: form.isCurrent,
      // Grade: exactly one of cgpa (number) / percentage (number) / grade (text);
      // the others are nulled so switching type on edit doesn't leave stale values.
      cgpa: form.gradeType === "cgpa" && gv ? Number(gv) : null,
      percentage: form.gradeType === "percentage" && gv ? Number(gv) : null,
      grade: form.gradeType === "grade" && gv ? gv : null,
    };
  };

  const handleSave = async () => {
    const input = buildInput();
    if (editId) await updateEdu.mutateAsync({ id: editId, patch: input });
    else await addEdu.mutateAsync(input);
    closeForm();
  };

  const handleDelete = async () => {
    if (!editId) return;
    await removeEdu.mutateAsync(editId);
    closeForm();
  };

  const saving = addEdu.isPending || updateEdu.isPending;

  // Every level can be used once — hide "Add" when all are taken.
  const usedLevels = new Set(items.map((it) => normalizeLevel(it.level)).filter(Boolean));
  const allLevelsUsed = EDUCATION_LEVELS.every((l) => usedLevels.has(l));

  // ── Form view (full width) ────────────────────────────────────────────────
  if (formOpen) {
    return (
      <EducationFormView
        editId={editId}
        form={form}
        setForm={setForm}
        levelOptions={levelOptions}
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
        <h2 className="flex-1 text-base font-semibold text-foreground">Education</h2>
        {!allLevelsUsed && (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <HugeiconsIcon icon={Add01Icon} size={16} className="mr-1.5" />
            Add
          </Button>
        )}
      </div>

      <section className="flex-1 overflow-y-auto px-6">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-6">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No education added yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <EducationListItem key={item.id} item={item} onEdit={openEdit}
                onRemove={async (id) => { await removeEdu.mutateAsync(id); }} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
