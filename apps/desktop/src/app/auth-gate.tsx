import { useLayoutEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/features/auth/api";
import { AuthFlow } from "@/features/auth/auth-flow";
import { OnboardingGuard } from "@/features/onboarding/onboarding-guard";

/**
 * Auth gate (REIN-305). Reads the session via Query and routes: loading spinner →
 * authed app vs the auth flow. Session is restored on launch by `auth:session`.
 *
 * Theme: the app is dark, the auth screens are light. We toggle `dark` on <html>
 * by auth state (loading stays dark by default → no flash).
 */
export function AuthGate() {
  const { data, isPending } = useSession();
  const authed = data?.ok === true;
  const onboarded = data?.ok ? Boolean(data.data.user.onboardingCompleted) : false;

  useLayoutEffect(() => {
    if (isPending) return; // keep the default dark during the session check
    // Dark only once inside the app; auth + onboarding render light (like studio).
    document.documentElement.classList.toggle("dark", authed && onboarded);
  }, [authed, onboarded, isPending]);

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return authed ? <OnboardingGuard /> : <AuthFlow />;
}
