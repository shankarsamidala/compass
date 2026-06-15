import { useSession } from "@/features/auth/api";
import { OnboardingFlow } from "./onboarding-flow";
import App from "@/App";

/**
 * Onboarding guard (REIN-312). Sits inside AuthGate's authed branch: routes to the
 * onboarding wizard until the user finishes it, otherwise into the app. Reads the
 * flag from the cached session (`/me` returns `onboardingCompleted`).
 */
export function OnboardingGuard() {
  const { data } = useSession();
  const completed = data?.ok ? Boolean(data.data.user.onboardingCompleted) : false;
  return completed ? <App /> : <OnboardingFlow />;
}
