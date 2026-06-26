import { useLayoutEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/features/auth/api";
import { AuthFlow } from "@/features/auth/auth-flow";
import { SetupGuard } from "@/features/setup/setup-guard";
import { setAnalyticsUser, clearAnalyticsUser } from "@/lib/analytics";

/**
 * Auth gate (REIN-305). Reads the session via Query and routes: loading spinner →
 * authed app vs the auth flow. Session is restored on launch by `auth:session`.
 */
export function AuthGate() {
  const { data, isPending } = useSession();
  const authed = data?.ok === true;
  const onboarded = data?.ok ? Boolean(data.data.user.onboardingCompleted) : false;

  useLayoutEffect(() => {
    if (isPending) return;
    if (authed && data?.data?.user) {
      setAnalyticsUser(data.data.user.id, data.data.user.email);
    } else if (!authed) {
      clearAnalyticsUser();
    }
  }, [authed, onboarded, isPending, data]);

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return authed ? <SetupGuard /> : <AuthFlow />;
}
