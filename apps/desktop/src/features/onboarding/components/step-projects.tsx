import { useEffect, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { SkillField } from "./skill-field";
import { blankProject, type OnboardingValues } from "../schema";

export function StepProjects({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, watch } = form;
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
              <FormField
                control={control}
                name={`projects.${i}.title`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Realtime chat app" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`projects.${i}.url`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Link (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="github.com/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={`projects.${i}.description`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What does it do, and what was your role?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`projects.${i}.techStack`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Tech stack</FormLabel>
                  <FormControl>
                    <SkillField value={field.value ?? []} onChange={field.onChange} placeholder="Add tech, e.g. React…" />
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
