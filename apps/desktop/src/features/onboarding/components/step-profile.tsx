import { type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { AsyncCombobox } from "./async-combobox";
import type { OnboardingValues } from "../schema";

export function StepProfile({ form }: { form: UseFormReturn<OnboardingValues> }) {
  const { control } = form;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>First name</FormLabel>
            <FormControl>
              <Input placeholder="Shankar" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="lastName"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Last name</FormLabel>
            <FormControl>
              <Input placeholder="Samidala" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="location"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Location</FormLabel>
            <FormControl>
              <AsyncCombobox id="location" kind="locations" value={field.value} onChange={field.onChange} placeholder="Search your city" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <InputGroup>
                <InputGroupAddon align="inline-start">+91</InputGroupAddon>
                <InputGroupInput
                  id="phone"
                  inputMode="numeric"
                  placeholder="Enter your 10-digit number"
                  {...field}
                />
              </InputGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="linkedin"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>LinkedIn username</FormLabel>
            <FormControl>
              <Input placeholder="your-handle" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="github"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>GitHub username</FormLabel>
            <FormControl>
              <Input placeholder="your-handle" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="portfolioUrl"
        render={({ field }) => (
          <FormItem className="space-y-1.5 sm:col-span-2">
            <FormLabel>Portfolio (optional)</FormLabel>
            <FormControl>
              <Input placeholder="https://…" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
