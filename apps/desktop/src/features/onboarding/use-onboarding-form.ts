import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";
import { onboardingSchema, DEFAULT_VALUES, STEP_FIELDS, toSubmit, type OnboardingValues } from "./schema";

/** Steps: resume, profile, targets, experience, work history, education,
 *  projects, proof points. (Resume is UI-only until its backend lands.) */
export const TOTAL_STEPS = 8;

export function useOnboardingForm() {
  const qc = useQueryClient();
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step as keyof typeof STEP_FIELDS]);
    if (ok) setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  /** Jump straight to a step (no validation) — used by the clickable progress bar. */
  const goTo = (n: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, n)));

  const submit = async () => {
    if (!(await form.trigger())) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await api.onboarding.submit(toSubmit(form.getValues()));
      if (res.ok) qc.invalidateQueries({ queryKey: qk.session });
      else setSubmitError(res.error);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not finish setup");
    } finally {
      setSubmitting(false);
    }
  };

  return { form, step, next, back, goTo, submit, submitting, submitError, isLast: step === TOTAL_STEPS };
}
