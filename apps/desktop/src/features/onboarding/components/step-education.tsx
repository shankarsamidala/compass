import { useEffect, useRef, useState } from "react";
import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OptionCombobox } from "./option-combobox";
import { EDUCATION_LEVELS, GRADING_SYSTEMS, blankEducation, type OnboardingValues } from "../schema";

export function StepEducation({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, register, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "eduEntries" });
  const values = watch("eduEntries");
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    if (fields.length === 0) {
      append(blankEducation());
      setOpenIndex(0);
    }
  }, [fields.length, append]);

  const addAnother = () => {
    append(blankEducation());
    setOpenIndex(fields.length);
  };
  const addRef = useRef(addAnother);
  addRef.current = addAnother;
  useEffect(() => {
    onRegisterAdd?.(() => addRef.current());
    return () => onRegisterAdd?.(null);
  }, [onRegisterAdd]);

  const filled = (i: number) => Boolean(values?.[i]?.level?.trim() && values?.[i]?.institution?.trim());
  const active = openIndex < fields.length ? openIndex : fields.length - 1;
  const removeAt = (i: number) => {
    remove(i);
    setOpenIndex(Math.max(0, fields.length - 2));
  };
  const yearRange = (i: number) => {
    const v = values?.[i];
    if (!v?.startYear && !v?.endYear) return null;
    return `${v?.startYear || "—"} – ${v?.isCurrent ? "Present" : v?.endYear || "—"}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f, i) => {
        if (i !== active) {
          if (!filled(i)) return null;
          const v = values?.[i];
          return (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl border border-input px-4 py-3">
              <button type="button" onClick={() => setOpenIndex(i)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">
                  {v?.level}
                  {v?.institution ? <span className="text-muted-foreground"> · {v.institution}</span> : null}
                </p>
                {yearRange(i) && <p className="text-xs text-muted-foreground">{yearRange(i)}</p>}
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

        const grading = watch(`eduEntries.${i}.gradingSystem`);
        const scorable = grading === "cgpa" || grading === "percentage";
        return (
          <div key={f.id} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Level</Label>
                <Controller control={control} name={`eduEntries.${i}.level`} render={({ field }) => (
                  <OptionCombobox options={EDUCATION_LEVELS} value={field.value} onChange={field.onChange} placeholder="Select level" />
                )} />
                {errors.eduEntries?.[i]?.level && <p className="text-xs text-destructive">{String(errors.eduEntries[i]?.level?.message)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Institution</Label>
                <Input className="h-10" placeholder="e.g. IIT Bombay" {...register(`eduEntries.${i}.institution`)} />
                {errors.eduEntries?.[i]?.institution && <p className="text-xs text-destructive">{String(errors.eduEntries[i]?.institution?.message)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Degree</Label>
                <Input className="h-10" placeholder="e.g. B.Tech" {...register(`eduEntries.${i}.degree`)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Field of study</Label>
                <Input className="h-10" placeholder="e.g. Computer Science" {...register(`eduEntries.${i}.fieldOfStudy`)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Start year</Label>
                <Input className="h-10" inputMode="numeric" placeholder="2018" {...register(`eduEntries.${i}.startYear`)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End year</Label>
                <Input className="h-10" inputMode="numeric" placeholder="2022" disabled={watch(`eduEntries.${i}.isCurrent`)} {...register(`eduEntries.${i}.endYear`)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`edu-cur-${i}`} className="font-normal">Currently studying</Label>
              <Controller control={control} name={`eduEntries.${i}.isCurrent`} render={({ field }) => (
                <Switch id={`edu-cur-${i}`} checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Grading system</Label>
                <Controller control={control} name={`eduEntries.${i}.gradingSystem`} render={({ field }) => (
                  <OptionCombobox options={GRADING_SYSTEMS} value={field.value} onChange={field.onChange} placeholder="Select" />
                )} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Score</Label>
                <Input className="h-10" inputMode="decimal" placeholder={grading === "percentage" ? "e.g. 85" : "e.g. 8.5"} disabled={!scorable} {...register(`eduEntries.${i}.score`)} />
                {errors.eduEntries?.[i]?.score && <p className="text-xs text-destructive">{String(errors.eduEntries[i]?.score?.message)}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
