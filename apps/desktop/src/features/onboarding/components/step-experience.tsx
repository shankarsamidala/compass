import { type UseFormReturn } from "react-hook-form";
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
import { HIGHEST_QUALIFICATIONS, type OnboardingValues } from "../schema";
import { AsyncCombobox } from "./async-combobox";
import { CompanyComboboxNova } from "./company-combobox-nova";

export function StepExperience({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { control, watch } = form;
  const fresher = watch("isFresher");
  const serving = watch("currentlyServingNotice");

  return (
    <div className="flex flex-col gap-5">
      {/* 1 — fresher toggle */}
      <FormField
        control={control}
        name="isFresher"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border border-input bg-transparent px-4 py-3 space-y-0">
            <div>
              <FormLabel htmlFor="fresher" className="cursor-pointer">I'm a fresher</FormLabel>
              <p className="text-xs text-muted-foreground">No prior full-time experience</p>
            </div>
            <FormControl>
              <Switch id="fresher" checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {!fresher && (
        <>
          {/* 2 — current role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="currentCompany"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Current company</FormLabel>
                  <FormControl>
                    <CompanyComboboxNova value={field.value ?? ""} onChange={field.onChange} placeholder="Search your company…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="currentDesignation"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Current designation</FormLabel>
                  <FormControl>
                    <AsyncCombobox value={field.value ?? ""} onChange={field.onChange} kind="roles" placeholder="Search role, e.g. Senior Engineer…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 3 — experience + notice period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="totalExperienceYears"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Total experience (years)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 5" inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="noticePeriod"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Notice period (days)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 90" inputMode="numeric" disabled={serving} {...field} />
                  </FormControl>
                  {/* 4 — serving notice toggle, inline below notice period (disables it when on) */}
                  <FormField
                    control={control}
                    name="currentlyServingNotice"
                    render={({ field: servingField }) => (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <FormLabel htmlFor="serving" className="font-normal cursor-pointer text-xs">
                          Currently serving notice
                         </FormLabel>
                        <FormControl>
                          <Switch id="serving" checked={servingField.value} onCheckedChange={servingField.onChange} />
                        </FormControl>
                      </div>
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 5 — compensation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="currentCtc"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Current CTC (LPA)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="expectedCtc"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Expected CTC (LPA)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 18" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {fresher && (
        <FormField
          control={control}
          name="expectedCtc"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Expected CTC (LPA)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 8" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* 6 — education */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="highestQualification"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Highest qualification</FormLabel>
              <FormControl>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full justify-between bg-transparent hover:bg-transparent data-placeholder:text-muted-foreground">
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {HIGHEST_QUALIFICATIONS.map((q) => (
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
          name="graduationYear"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Graduation year</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 2024" inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

