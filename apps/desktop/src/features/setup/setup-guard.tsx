import { useState } from "react";
import { SetupScreen } from "./setup-screen";
import { OnboardingGuard } from "@/features/onboarding/onboarding-guard";

const SETUP_KEY = "reinit:setup-done";

/**
 * Setup gate. After account creation (authed) we run the one-time environment
 * setup (CLI token, checks) before handing off to onboarding. Setup is local to
 * the machine, so completion is tracked in localStorage — onboarding stays the
 * server-side gate.
 */
export function SetupGuard() {
  const [done, setDone] = useState(() => localStorage.getItem(SETUP_KEY) === "1");

  if (!done) {
    return (
      <SetupScreen
        onComplete={() => {
          localStorage.setItem(SETUP_KEY, "1");
          setDone(true);
        }}
      />
    );
  }
  return <OnboardingGuard />;
}
