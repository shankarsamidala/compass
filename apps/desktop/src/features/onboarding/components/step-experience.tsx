import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { HIGHEST_QUALIFICATIONS, type OnboardingValues } from "../schema";
import { AsyncCombobox } from "./async-combobox";
import { CompanyComboboxNova } from "./company-combobox-nova";
import { OptionCombobox } from "./option-combobox";

export function StepExperience({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { register, control, watch, formState: { errors } } = form;
  const fresher = watch("isFresher");
  const serving = watch("currentlyServingNotice");

  return (
    <div className="flex flex-col gap-5">
      {/* 1 — fresher toggle */}
      <div className="flex items-center justify-between rounded-lg border border-input bg-transparent px-4 py-3">
        <div>
          <Label htmlFor="fresher">I'm a fresher</Label>
          <p className="text-xs text-muted-foreground">No prior full-time experience</p>
        </div>
        <Controller control={control} name="isFresher" render={({ field }) => (
          <Switch id="fresher" checked={field.value} onCheckedChange={field.onChange} />
        )} />
      </div>

      {!fresher && (
        <>
          {/* 2 — current role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Current company</Label>
              <Controller control={control} name="currentCompany" render={({ field }) => (
                <CompanyComboboxNova value={field.value ?? ""} onChange={field.onChange} placeholder="Search your company…" />
              )} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Current designation</Label>
              <Controller control={control} name="currentDesignation" render={({ field }) => (
                <AsyncCombobox value={field.value ?? ""} onChange={field.onChange} kind="roles" placeholder="Search role, e.g. Senior Engineer…" />
              )} />
            </div>
          </div>

          {/* 3 — experience + notice period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Total experience (years)</Label>
              <Input className="h-10" inputMode="numeric" {...register("totalExperienceYears")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notice period (days)</Label>
              <Input className="h-10" inputMode="numeric" disabled={serving} {...register("noticePeriod")} />
              {/* 4 — serving notice toggle, inline below notice period (disables it when on) */}
              <div className="mt-1 flex items-center justify-between gap-2">
                <FieldLabel htmlFor="serving" className="font-normal">
                  Currently serving notice
                </FieldLabel>
                <Controller control={control} name="currentlyServingNotice" render={({ field }) => (
                  <Switch id="serving" checked={field.value} onCheckedChange={field.onChange} />
                )} />
              </div>
            </div>
          </div>

          {/* 5 — compensation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Current CTC (LPA)</Label>
              <Input className="h-10" {...register("currentCtc")} />
              {errors.currentCtc && <p className="text-xs text-destructive">{String(errors.currentCtc.message)}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expected CTC (LPA)</Label>
              <Input className="h-10" {...register("expectedCtc")} />
              {errors.expectedCtc && <p className="text-xs text-destructive">{String(errors.expectedCtc.message)}</p>}
            </div>
          </div>
        </>
      )}

      {fresher && (
        <div className="flex flex-col gap-1.5">
          <Label>Expected CTC (LPA)</Label>
          <Input className="h-10" {...register("expectedCtc")} />
          {errors.expectedCtc && <p className="text-xs text-destructive">{String(errors.expectedCtc.message)}</p>}
        </div>
      )}

      {/* 6 — education */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Highest qualification</Label>
          <Controller control={control} name="highestQualification" render={({ field }) => (
            <OptionCombobox options={HIGHEST_QUALIFICATIONS} value={field.value} onChange={field.onChange} />
          )} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Graduation year</Label>
          <Input className="h-10" inputMode="numeric" {...register("graduationYear")} />
        </div>
      </div>
    </div>
  );
}
