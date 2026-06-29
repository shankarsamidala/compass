import { useEffect, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Pencil, Trash2, Sparkles, Loader2, FileText } from "lucide-react";
import { api } from "@/lib/ipc";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { blankProofPoint, type OnboardingValues } from "../schema";

export function StepProofPoints({
  form,
  onRegisterAdd,
}: {
  form: UseFormReturn<OnboardingValues>;
  onRegisterAdd?: (fn: (() => void) | null) => void;
}) {
  const { control, watch, setValue, getValues } = form;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "proofPoints" });
  const values = watch("proofPoints");
  const resumeText = watch("resumeText");
  const [openIndex, setOpenIndex] = useState(0);
  const [optimizingIndex, setOptimizingIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const importFromResume = async () => {
    if (!resumeText?.trim()) return;
    setAiError(null);
    setImporting(true);
    try {
      const res = await api.llm.extractProofPoints(resumeText);
      if (!res.ok) {
        setAiError(res.error);
        return;
      }
      if (!res.data.points.length) {
        setAiError("Couldn't find clear achievements in your resume — add them manually.");
        return;
      }
      const mapped = res.data.points.map((p) => ({ title: p.title, metric: p.metric, url: "" }));
      const existing = getValues("proofPoints").filter((p) => p.title.trim());
      const next = [...existing, ...mapped];
      replace(next);
      setOpenIndex(next.length - 1);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const optimize = async (i: number) => {
    const draft = getValues(`proofPoints.${i}.title`)?.trim();
    if (!draft) return;
    setAiError(null);
    setOptimizingIndex(i);
    try {
      const res = await api.llm.optimizeProofPoint(draft, getValues(`proofPoints.${i}.metric`) || undefined);
      if (res.ok) {
        setValue(`proofPoints.${i}.title`, res.data.text, { shouldDirty: true });
        if (res.data.metric) setValue(`proofPoints.${i}.metric`, res.data.metric, { shouldDirty: true });
      } else {
        setAiError(res.error);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Optimize failed");
    } finally {
      setOptimizingIndex(null);
    }
  };

  useEffect(() => {
    if (fields.length === 0) {
      append(blankProofPoint());
      setOpenIndex(0);
    }
  }, [fields.length, append]);

  const addAnother = () => {
    append(blankProofPoint());
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
      {resumeText?.trim() && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <FileText className="size-4 shrink-0 text-brand" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">Import from your resume</span>
              <span className="text-xs text-muted-foreground">We'll pull achievements from the CV you uploaded.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={importFromResume}
            disabled={importing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {importing ? "Reading…" : "Import"}
          </button>
        </div>
      )}
      {aiError && <p className="text-xs text-destructive">{aiError}</p>}

      {fields.map((f, i) => {
        if (i !== active) {
          if (!filled(i)) return null;
          const v = values?.[i];
          return (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl border border-input px-4 py-3">
              <button type="button" onClick={() => setOpenIndex(i)} className="min-w-0 flex-1 text-left">
                <p className="line-clamp-2 text-sm font-medium">{v?.title}</p>
                {v?.metric?.trim() ? <p className="truncate text-xs text-muted-foreground">{v.metric}</p> : null}
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
            <FormField
              control={control}
              name={`proofPoints.${i}.title`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <FormLabel>Achievement</FormLabel>
                    <button
                      type="button"
                      onClick={() => optimize(i)}
                      disabled={optimizingIndex === i || !values?.[i]?.title?.trim()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
                    >
                      {optimizingIndex === i ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      {optimizingIndex === i ? "Optimizing…" : "Optimize with AI"}
                    </button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Jot it down rough — e.g. reduced aws bill by migrating services to eks — then let AI polish it."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`proofPoints.${i}.metric`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Metric (optional)</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder="e.g. -22% cost · 2.1s → 380ms" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`proofPoints.${i}.url`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Evidence link (optional)</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder="github.com/… or article link" {...field} />
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
