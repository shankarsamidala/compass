import { useEffect, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDUCATION_LEVELS, GRADING_SYSTEMS, blankEducation, type OnboardingValues } from "../schema";

export function StepEducation({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, watch } = form;
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
              <FormField
                control={control}
                name={`eduEntries.${i}.level`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Level</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="!h-10 w-full justify-between bg-transparent hover:bg-transparent data-placeholder:text-muted-foreground">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {EDUCATION_LEVELS.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
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
                name={`eduEntries.${i}.institution`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Institution</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder="e.g. IIT Bombay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`eduEntries.${i}.degree`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Degree</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder="e.g. B.Tech" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`eduEntries.${i}.fieldOfStudy`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Field of study</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder="e.g. Computer Science" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`eduEntries.${i}.startYear`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Start year</FormLabel>
                    <FormControl>
                      <Input className="h-10" inputMode="numeric" placeholder="2018" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`eduEntries.${i}.endYear`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>End year</FormLabel>
                    <FormControl>
                      <Input className="h-10" inputMode="numeric" placeholder="2022" disabled={watch(`eduEntries.${i}.isCurrent`)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={`eduEntries.${i}.isCurrent`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel htmlFor={`edu-cur-${i}`} className="font-normal cursor-pointer">Currently studying</FormLabel>
                  <FormControl>
                    <Switch id={`edu-cur-${i}`} checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name={`eduEntries.${i}.gradingSystem`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Grading system</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="!h-10 w-full justify-between bg-transparent hover:bg-transparent data-placeholder:text-muted-foreground">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {GRADING_SYSTEMS.map((o) => (
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
                name={`eduEntries.${i}.score`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Score</FormLabel>
                    <FormControl>
                      <Input className="h-10" inputMode="decimal" placeholder={grading === "percentage" ? "e.g. 85" : "e.g. 8.5"} disabled={!scorable} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
