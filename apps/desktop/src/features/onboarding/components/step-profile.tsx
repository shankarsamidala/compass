import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestCombobox } from "./suggest-combobox";
import type { OnboardingValues } from "../schema";

export function StepProfile({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { register, control, formState: { errors } } = form;
  const err = (name: keyof OnboardingValues) =>
    errors[name] ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" placeholder="Shankar" className="h-11" {...register("firstName")} />
        {err("firstName")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" placeholder="Samidala" className="h-11" {...register("lastName")} />
        {err("lastName")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <SuggestCombobox id="location" value={field.value} onChange={field.onChange} kind="locations" placeholder="Search your city" />
          )}
        />
        {err("location")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <div className="flex h-11 items-center rounded-4xl border border-input bg-input/30 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <span className="pl-3.5 pr-2 text-sm text-muted-foreground">+91</span>
          <input
            id="phone"
            inputMode="numeric"
            placeholder="10-digit number"
            className="h-full flex-1 rounded-r-4xl bg-transparent pr-3.5 text-sm outline-none placeholder:text-muted-foreground"
            {...register("phone")}
          />
        </div>
        {err("phone")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="linkedin">LinkedIn username</Label>
        <Input id="linkedin" placeholder="your-handle" className="h-11" {...register("linkedin")} />
        {err("linkedin")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="github">GitHub username</Label>
        <Input id="github" placeholder="your-handle" className="h-11" {...register("github")} />
        {err("github")}
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="portfolioUrl">Portfolio (optional)</Label>
        <Input id="portfolioUrl" placeholder="https://…" className="h-11" {...register("portfolioUrl")} />
      </div>
    </div>
  );
}
