import { useEffect, useRef, useState } from "react";
import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "./chip-input";
import { ALL_SKILLS, blankProject, type OnboardingValues } from "../schema";

export function StepProjects({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, register, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "projects" });
  const values = watch("projects");
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    if (fields.length === 0) {
      append(blankProject());
      setOpenIndex(0);
    }
  }, [fields.length, append]);

  const addAnother = () => {
    append(blankProject());
    setOpenIndex(fields.length);
  };
  const addRef = useRef(addAnother);
  addRef.current = addAnother;
  useEffect(() => {
    onRegisterAdd?.(() => addRef.current());
    return () => onRegisterAdd?.(null);
  }, [onRegisterAdd]);

  const filled = (i: number) => Boolean(values?.[i]?.title?.trim());
  const active = openIndex < fields.length ? openIndex : fields.length - 1;
  const removeAt = (i: number) => {
    remove(i);
    setOpenIndex(Math.max(0, fields.length - 2));
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
                <p className="truncate text-sm font-medium">{v?.title}</p>
                {v?.techStack?.length ? <p className="truncate text-xs text-muted-foreground">{v.techStack.join(" · ")}</p> : null}
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

        return (
          <div key={f.id} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input className="h-11" placeholder="e.g. Realtime chat app" {...register(`projects.${i}.title`)} />
                {errors.projects?.[i]?.title && <p className="text-xs text-destructive">{String(errors.projects[i]?.title?.message)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Link (optional)</Label>
                <Input className="h-11" placeholder="github.com/…" {...register(`projects.${i}.url`)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea placeholder="What does it do, and what was your role?" {...register(`projects.${i}.description`)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tech stack</Label>
              <Controller control={control} name={`projects.${i}.techStack`} render={({ field }) => (
                <ChipInput value={field.value} onChange={field.onChange} placeholder="Add tech…" suggestions={ALL_SKILLS} />
              )} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
