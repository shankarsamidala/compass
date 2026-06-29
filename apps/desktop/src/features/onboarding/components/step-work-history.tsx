import { useEffect, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { AsyncCombobox } from "./async-combobox";
import { CompanyComboboxNova } from "./company-combobox-nova";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { control, watch } = form;
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
              <FormField
                control={control}
                name={`experiences.${i}.title`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Role title</FormLabel>
                    <FormControl>
                      <AsyncCombobox value={field.value} onChange={field.onChange} kind="roles" placeholder="Search role, e.g. Senior Engineer…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`experiences.${i}.company`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <CompanyComboboxNova value={field.value ?? ""} onChange={field.onChange} placeholder="e.g. Acme Inc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`experiences.${i}.location`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <AsyncCombobox value={field.value} onChange={field.onChange} kind="locations" placeholder="Search city…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`experiences.${i}.employmentType`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Employment type</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="!h-10 w-full justify-between bg-transparent hover:bg-transparent data-placeholder:text-muted-foreground">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {EMPLOYMENT_TYPES.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`experiences.${i}.startDate`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <DateField value={field.value} onChange={field.onChange} placeholder="Start date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`experiences.${i}.endDate`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <DateField value={field.value} onChange={field.onChange} disabled={watch(`experiences.${i}.isCurrent`)} placeholder="End date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={`experiences.${i}.isCurrent`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel htmlFor={`cur-${i}`} className="font-normal cursor-pointer">I currently work here</FormLabel>
                  <FormControl>
                    <Switch id={`cur-${i}`} checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`experiences.${i}.skills`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <SkillField value={field.value ?? []} onChange={field.onChange} placeholder="Add skills…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`experiences.${i}.highlights`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Highlights</FormLabel>
                  <FormControl>
                    <Textarea placeholder="One achievement per line" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
