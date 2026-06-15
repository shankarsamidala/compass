import { AuthLayout } from "@/features/auth/auth-layout";
import { OnboardingShell } from "./onboarding-shell";
import { SignOutButton } from "./sign-out-button";

/**
 * Onboarding page (REIN-312/314). Reuses the shared two-column shell (light form
 * + dark brand panel) with onboarding brand copy, a wider form, and sign-out.
 */
export function OnboardingFlow() {
  return (
    <AuthLayout
      maxWidthClass="max-w-xl"
      footer={false}
      topRight={<SignOutButton />}
      brand={{
        lead: "A few quick details,",
        accent: "then we get to work.",
        subtitle:
          "We use these to tailor matches and recommendations. You can edit everything later from your profile.",
      }}
    >
      <OnboardingShell />
    </AuthLayout>
  );
}
