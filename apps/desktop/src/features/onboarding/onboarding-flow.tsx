import { AuthLayout } from "@/features/auth/auth-layout";
import { OnboardingShell } from "./onboarding-shell";
import { SignOutButton } from "./sign-out-button";

/**
 * Onboarding page (REIN-312/314). Reuses the shared two-column shell (light form
 * + dark brand panel) with onboarding brand copy, a wider form, and sign-out.
 */
export function OnboardingFlow() {
  return (
    <AuthLayout maxWidthClass="max-w-xl" topRight={<SignOutButton />}>
      <OnboardingShell />
    </AuthLayout>
  );
}
