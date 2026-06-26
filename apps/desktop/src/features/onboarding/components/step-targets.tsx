import { Controller, type UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiCombobox } from "./multi-combobox";
import { OptionCombobox } from "./option-combobox";
import { api } from "@/lib/ipc";
import type { SuggestKind } from "@compass/ipc-contract";
import { EMPLOYMENT_TYPES, type OnboardingValues } from "../schema";

/** Live autocomplete fetcher backed by the suggest provider (roles / locations). */
const suggestFetcher = (kind: SuggestKind) => async (q: string) => {
  const res = await api.suggest.query(kind, q);
  return res.ok ? res.data : [];
};

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
            <MultiCombobox value={field.value} onChange={field.onChange} placeholder="Search roles, e.g. DevOps Engineer…" fetcher={suggestFetcher("roles")} />
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
              <OptionCombobox
                id="employmentType"
                options={EMPLOYMENT_TYPES}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.employmentType && <p className="text-xs text-destructive">{String(errors.employmentType.message)}</p>}
        </div>

        <div className="flex h-10 items-center justify-between gap-2 self-end rounded-lg border border-input bg-transparent px-4">
          <Label htmlFor="remote">Open to remote</Label>
          <Controller control={control} name="openToRemote" render={({ field }) => (
            <Switch id="remote" checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
      </div>

      <div className="flex h-10 items-center justify-between rounded-lg border border-input bg-transparent px-4">
        <Label htmlFor="relocate">Open to relocation</Label>
        <Controller control={control} name="openToRelocation" render={({ field }) => (
          <Switch id="relocate" checked={field.value} onCheckedChange={field.onChange} />
        )} />
      </div>

      {relocate && (
        <div className="flex flex-col gap-1.5">
          <Label>Preferred locations</Label>
          <Controller control={control} name="preferredLocations" render={({ field }) => (
            <MultiCombobox value={field.value} onChange={field.onChange} placeholder="Search cities you'd relocate to…" fetcher={suggestFetcher("locations")} />
          )} />
        </div>
      )}
    </div>
  );
}
