import { type UseFormReturn } from "react-hook-form";
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
import { MultiCombobox } from "./multi-combobox";
import { api } from "@/lib/ipc";
import type { SuggestKind } from "@compass/ipc-contract";
import { EMPLOYMENT_TYPES, type OnboardingValues } from "../schema";
import { searchJobTitles } from "@/data/job-titles";

/** Live autocomplete fetcher backed by the suggest provider (locations). */
const suggestFetcher = (kind: SuggestKind) => async (q: string) => {
  const res = await api.suggest.query(kind, q);
  return res.ok ? res.data : [];
};

/** Roles come from the local job-title list — no API call. */
const rolesFetcher = async (q: string) => searchJobTitles(q, 50);

export function StepTargets({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { control, watch } = form;
  const relocate = watch("openToRelocation");

  return (
    <div className="flex flex-col gap-5">
      <FormField
        control={control}
        name="selectedRoles"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Target roles</FormLabel>
            <FormControl>
              <MultiCombobox value={field.value} onChange={field.onChange} placeholder="Search roles, e.g. DevOps Engineer…" fetcher={rolesFetcher} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="employmentType"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Employment type</FormLabel>
            <FormControl>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="employmentType" className="!h-10 w-full justify-between bg-transparent hover:bg-transparent data-placeholder:text-muted-foreground">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {EMPLOYMENT_TYPES.map((o) => (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="openToRemote"
          render={({ field }) => (
            <FormItem className="flex h-10 items-center justify-between gap-2 rounded-4xl border border-input bg-transparent px-4 space-y-0">
              <FormLabel htmlFor="remote" className="cursor-pointer">Open to remote</FormLabel>
              <FormControl>
                <Switch id="remote" checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="openToRelocation"
          render={({ field }) => (
            <FormItem className="flex h-10 items-center justify-between gap-2 rounded-4xl border border-input bg-transparent px-4 space-y-0">
              <FormLabel htmlFor="relocate" className="cursor-pointer">Open to relocation</FormLabel>
              <FormControl>
                <Switch id="relocate" checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {relocate && (
        <FormField
          control={control}
          name="preferredLocations"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Preferred locations</FormLabel>
              <FormControl>
                <MultiCombobox value={field.value} onChange={field.onChange} placeholder="Search cities you'd relocate to…" fetcher={suggestFetcher("locations")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
