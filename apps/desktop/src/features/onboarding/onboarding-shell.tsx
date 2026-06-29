import { useCallback, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingForm, TOTAL_STEPS } from "./use-onboarding-form";
import { Form } from "@/components/ui/form";
import { StepResume } from "./components/step-resume";
import { StepProfile } from "./components/step-profile";
import { StepTargets } from "./components/step-targets";
import { StepExperience } from "./components/step-experience";
import { StepWorkHistory } from "./components/step-work-history";
import { StepEducation } from "./components/step-education";
import { StepProjects } from "./components/step-projects";
import { StepProofPoints } from "./components/step-proofpoints";

const META: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Tell us about yourself", subtitle: "The basics so we can address you and link your profiles." },
  2: { title: "What you're looking for", subtitle: "Target roles and preferences shape which jobs we surface." },
  3: { title: "Experience & compensation", subtitle: "Helps us pitch you at the right level and salary band." },
  4: { title: "Work history", subtitle: "The roles you've held. Freshers can skip this." },
  5: { title: "Education", subtitle: "Where you studied — add one or more. Optional." },
  6: { title: "Projects", subtitle: "Side projects and open source — great for freshers and switchers. Optional." },
  7: { title: "Import your resume", subtitle: "Upload your CV — we'll pull out proof points for the next step. Optional." },
  8: { title: "Proof points", subtitle: "Quantified wins that make recruiters stop scrolling. Optional." },
};

function StepIndicator({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-medium tracking-wider tabular-nums">
        <span className="text-brand">{pad(step)}</span>
        <span className="text-muted-foreground"> / {pad(TOTAL_STEPS)}</span>
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onJump(n)}
            aria-label={`Go to step ${n}`}
            className={
              "h-1.5 w-4 rounded-full transition-colors duration-300 hover:opacity-80 " +
              (n <= step ? "bg-brand" : "bg-border")
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Onboarding shell (REIN-314) — the wizard frame matching studio, now driving the
 * profile / targets / experience steps (REIN-313). Record steps (resume, work
 * history, education, projects, proof points) land next and bump TOTAL_STEPS.
 */
export function OnboardingShell() {
  const { form, step, next, back, goTo, submit, submitting, submitError, isLast } = useOnboardingForm();
  const meta = META[step];

  // Steps with repeatable records register an "add" action shown next to Continue.
  const [addAnother, setAddAnother] = useState<(() => void) | null>(null);
  const registerAdd = useCallback((fn: (() => void) | null) => setAddAnother(() => fn), []);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Per-step validation: advancing must check only the current step's
          // fields (next()/submit() handle that). Routing through
          // form.handleSubmit would validate the whole schema up front and
          // block step 1 on fields that belong to later steps.
          e.preventDefault();
          if (isLast) submit();
          else next();
        }}
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight">{meta.title}</h2>
            <StepIndicator step={step} onJump={goTo} />
          </div>
          <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        </div>

        {/* Fixed-height step area: keeps the header above and the action buttons
            below in a constant position so the card doesn't resize between steps.
            Taller steps scroll within this region. */}
        <div className="h-[440px] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            {step === 1 && <StepProfile form={form} />}
            {step === 2 && <StepTargets form={form} />}
            {step === 3 && <StepExperience form={form} />}
            {step === 4 && <StepWorkHistory form={form} onRegisterAdd={registerAdd} />}
            {step === 5 && <StepEducation form={form} onRegisterAdd={registerAdd} />}
            {step === 6 && <StepProjects form={form} onRegisterAdd={registerAdd} />}
            {step === 7 && <StepResume form={form} />}
            {step === 8 && <StepProofPoints form={form} onRegisterAdd={registerAdd} />}
          </div>
        </div>

        {submitError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
        )}

        {step === 1 ? (
          // Step 1 has no Back / Add — give Continue the full width.
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-10 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Continue
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <Button type="button" size="lg" variant="outline" onClick={back} disabled={submitting} className="h-10 gap-2 hover:border-brand hover:ring-1 hover:ring-brand">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              {addAnother && (
                <Button type="button" size="lg" variant="outline" onClick={addAnother} disabled={submitting} className="h-10 gap-2 hover:border-brand hover:ring-1 hover:ring-brand">
                  <Plus className="size-4" />
                  Add another
                </Button>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-10 bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                {isLast ? (submitting ? "Finishing…" : "Finish setup") : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
