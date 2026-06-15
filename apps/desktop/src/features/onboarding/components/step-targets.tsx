import { Controller, type UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "./chip-input";
import { EMPLOYMENT_TYPES, type OnboardingValues } from "../schema";

export function StepTargets({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { control, watch, formState: { errors } } = form;
  const relocate = watch("openToRelocation");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Target roles</Label>
        <Controller
          control={control}
          name="selectedRoles"
          render={({ field }) => (
            <ChipInput value={field.value} onChange={field.onChange} placeholder="Search roles, e.g. DevOps Engineer…" suggestKind="roles" />
          )}
        />
        {errors.selectedRoles && <p className="text-xs text-destructive">{String(errors.selectedRoles.message)}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Employment type</Label>
          <Controller
            control={control}
            name="employmentType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="!h-11 w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.employmentType && <p className="text-xs text-destructive">{String(errors.employmentType.message)}</p>}
        </div>

        <div className="flex h-11 items-center justify-between gap-2 self-end rounded-4xl border border-input bg-input/30 px-4">
          <Label htmlFor="remote">Open to remote</Label>
          <Controller control={control} name="openToRemote" render={({ field }) => (
            <Switch id="remote" checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
      </div>

      <div className="flex h-11 items-center justify-between rounded-4xl border border-input bg-input/30 px-4">
        <Label htmlFor="relocate">Open to relocation</Label>
        <Controller control={control} name="openToRelocation" render={({ field }) => (
          <Switch id="relocate" checked={field.value} onCheckedChange={field.onChange} />
        )} />
      </div>

      {relocate && (
        <div className="flex flex-col gap-1.5">
          <Label>Preferred locations</Label>
          <Controller control={control} name="preferredLocations" render={({ field }) => (
            <ChipInput value={field.value} onChange={field.onChange} placeholder="Search cities you'd relocate to…" suggestKind="locations" />
          )} />
        </div>
      )}
    </div>
  );
}
