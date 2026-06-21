import { useEffect, useRef, useState } from "react";
import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AsyncCombobox } from "./async-combobox";
import { CompanyComboboxNova } from "./company-combobox-nova";
import { OptionCombobox } from "./option-combobox";
import { DateField } from "./date-field";
import { SkillField } from "./skill-field";
import { EMPLOYMENT_TYPES, blankExperience, type OnboardingValues } from "../schema";

export function StepWorkHistory({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, register, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "experiences" });
  const fresher = watch("isFresher");
  const values = watch("experiences");
  const [openIndex, setOpenIndex] = useState(0);

  // Seed the first row ONCE from steps 1–3 (current company/designation, profile
  // location, target employment type) so the user doesn't retype their current job.
  // Guarded with a ref so StrictMode's double-effect can't append it twice.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || fresher || fields.length > 0) return;
    seededRef.current = true;
    const company = form.getValues("currentCompany")?.trim();
    const title = form.getValues("currentDesignation")?.trim();
    const location = form.getValues("location")?.trim(); // from step 1 (profile)
    const employmentType = form.getValues("employmentType"); // from step 2 (targets)
    append({
      ...blankExperience(),
      ...(company ? { company } : {}),
      ...(title ? { title } : {}),
      ...(location ? { location } : {}),
      ...(employmentType ? { employmentType } : {}),
      ...(company || title ? { isCurrent: true } : {}),
    });
    setOpenIndex(0);
  }, [fresher, fields.length, append, form]);

  // "Add another role" lives in the shell footer (next to Continue). Register it
  // via a ref so the latest closure (current fields.length) is always used.
  const addAnother = () => {
    append(blankExperience());
    setOpenIndex(fields.length); // becomes the new last index
  };
  const addRef = useRef(addAnother);
  addRef.current = addAnother;
  useEffect(() => {
    if (fresher) {
      onRegisterAdd?.(null);
      return;
    }
    onRegisterAdd?.(() => addRef.current());
    return () => onRegisterAdd?.(null);
  }, [fresher, onRegisterAdd]);

  if (fresher) {
    return (
      <p className="rounded-2xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
        You marked yourself a fresher — we'll skip work history. Add projects next to showcase your work.
      </p>
    );
  }

  const filled = (i: number) => Boolean(values?.[i]?.title?.trim() && values?.[i]?.company?.trim());
  const active = openIndex < fields.length ? openIndex : fields.length - 1;

  const removeAt = (i: number) => {
    remove(i);
    setOpenIndex(Math.max(0, fields.length - 2));
  };

  const dateRange = (i: number) => {
    const v = values?.[i];
    if (!v?.startDate && !v?.endDate) return null;
    return `${v?.startDate || "—"} – ${v?.isCurrent ? "Present" : v?.endDate || "—"}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f, i) => {
        // Collapsed summary for filled, non-active entries.
        if (i !== active) {
          if (!filled(i)) return null;
          const v = values?.[i];
          return (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-input px-4 py-3"
            >
              <button type="button" onClick={() => setOpenIndex(i)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">
                  {v?.title}
                  {v?.company ? <span className="text-muted-foreground"> · {v.company}</span> : null}
                </p>
                {dateRange(i) && <p className="text-xs text-muted-foreground">{dateRange(i)}</p>}
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" aria-label="Edit" onClick={() => setOpenIndex(i)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="size-4" />
                </button>
                <button type="button" aria-label="Remove" onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        }

        // Active, fully-editable form — plain fields like step 1 (no card).
        return (
          <div key={f.id} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Role title</Label>
                <Controller control={control} name={`experiences.${i}.title`} render={({ field }) => (
                  <AsyncCombobox value={field.value} onChange={field.onChange} kind="roles" placeholder="Search role, e.g. Senior Engineer…" />
                )} />
                {errors.experiences?.[i]?.title && <p className="text-xs text-destructive">{String(errors.experiences[i]?.title?.message)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Controller control={control} name={`experiences.${i}.company`} render={({ field }) => (
                  <CompanyComboboxNova value={field.value ?? ""} onChange={field.onChange} placeholder="e.g. Acme Inc." />
                )} />
                {errors.experiences?.[i]?.company && <p className="text-xs text-destructive">{String(errors.experiences[i]?.company?.message)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location</Label>
                <Controller control={control} name={`experiences.${i}.location`} render={({ field }) => (
                  <AsyncCombobox value={field.value} onChange={field.onChange} kind="locations" placeholder="Search city…" />
                )} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Employment type</Label>
                <Controller control={control} name={`experiences.${i}.employmentType`} render={({ field }) => (
                  <OptionCombobox options={EMPLOYMENT_TYPES} value={field.value} onChange={field.onChange} placeholder="Select type" />
                )} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Start</Label>
                <Controller control={control} name={`experiences.${i}.startDate`} render={({ field }) => (
                  <DateField value={field.value} onChange={field.onChange} placeholder="Start date" />
                )} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End</Label>
                <Controller control={control} name={`experiences.${i}.endDate`} render={({ field }) => (
                  <DateField value={field.value} onChange={field.onChange} disabled={watch(`experiences.${i}.isCurrent`)} placeholder="End date" />
                )} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`cur-${i}`} className="font-normal">I currently work here</Label>
              <Controller control={control} name={`experiences.${i}.isCurrent`} render={({ field }) => (
                <Switch id={`cur-${i}`} checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Skills</Label>
              <Controller control={control} name={`experiences.${i}.skills`} render={({ field }) => (
                <SkillField value={field.value ?? []} onChange={field.onChange} placeholder="Add skills…" />
              )} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Highlights</Label>
              <Textarea placeholder="One achievement per line" {...register(`experiences.${i}.highlights`)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
