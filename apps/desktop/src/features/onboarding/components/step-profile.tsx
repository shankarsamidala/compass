import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "./async-combobox";
import type { OnboardingValues } from "../schema";

export function StepProfile({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { register, control, formState: { errors } } = form;
  const err = (name: keyof OnboardingValues) =>
    errors[name] ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" placeholder="Shankar" className="h-10" {...register("firstName")} />
        {err("firstName")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" placeholder="Samidala" className="h-10" {...register("lastName")} />
        {err("lastName")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <AsyncCombobox id="location" kind="locations" value={field.value} onChange={field.onChange} placeholder="Search your city" />
          )}
        />
        {err("location")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <div className="flex h-10 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <span className="pl-2.5 pr-2 text-sm text-muted-foreground">+91</span>
          <input
            id="phone"
            inputMode="numeric"
            placeholder="10-digit number"
            className="h-full flex-1 rounded-r-lg bg-transparent pr-2.5 text-sm outline-none placeholder:text-muted-foreground"
            {...register("phone")}
          />
        </div>
        {err("phone")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="linkedin">LinkedIn username</Label>
        <Input id="linkedin" placeholder="your-handle" className="h-10" {...register("linkedin")} />
        {err("linkedin")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="github">GitHub username</Label>
        <Input id="github" placeholder="your-handle" className="h-10" {...register("github")} />
        {err("github")}
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="portfolioUrl">Portfolio (optional)</Label>
        <Input id="portfolioUrl" placeholder="https://…" className="h-10" {...register("portfolioUrl")} />
      </div>
    </div>
  );
}
