import { safeHandle } from "../core/ipc";
import { authService } from "../services/auth.service";
import { onboardingService } from "../services/onboarding.service";
import { suggestService } from "../services/suggest.service";
import { llmService } from "../services/llm.service";
import { documentService } from "../services/document.service";
import { jobsService } from "../services/jobs.service";
import { settingsService } from "../services/settings.service";
import { profileService } from "../services/profile.service";

/** Registers all IPC channels. Called once from main on app ready. */
export function registerIpcHandlers(): void {
  // ── Auth (REIN-304) ──
  safeHandle("auth:signup", (email: string, password: string) => authService.signup(email, password));
  safeHandle("auth:verify-email", (email: string, otp: string) => authService.verifyEmail(email, otp));
  safeHandle("auth:resend-otp", (email: string) => authService.resendOtp(email));
  safeHandle("auth:login", (email: string, password: string) => authService.login(email, password));
  safeHandle("auth:forgot-password", (email: string) => authService.forgotPassword(email));
  safeHandle("auth:reset-password", (email: string, otp: string, password: string) =>
    authService.resetPassword(email, otp, password),
  );
  safeHandle("auth:logout", () => authService.logout());
  safeHandle("auth:session", () => authService.getSession());

  // ── Onboarding (REIN-312/313) ──
  safeHandle("onboarding:status", () => onboardingService.status());
  safeHandle("onboarding:complete", () => onboardingService.complete());
  safeHandle("onboarding:submit", (data) => onboardingService.submit(data));

  // ── Suggest (autocomplete) ──
  safeHandle("suggest:query", (kind, q) => suggestService.query(kind, q));

  // ── LLM (BYO-LLM, local inference) ──
  safeHandle("llm:optimize-proof-point", (draft: string, metric?: string) =>
    llmService.optimizeProofPoint(draft, metric),
  );
  safeHandle("llm:extract-proof-points", (resumeText: string) =>
    llmService.extractProofPoints(resumeText),
  );

  // ── Document (local file → text) ──
  safeHandle("document:extract", (fileName: string, bytes: Uint8Array) =>
    documentService.extractText(fileName, bytes),
  );

  // ── Jobs (feed + detail + scan) ──
  safeHandle("jobs:list", () => jobsService.list());
  safeHandle("jobs:get", (id: string) => jobsService.get(id));
  safeHandle("jobs:scan", (opts: { maxPerRole: number; jobAge: number }) => jobsService.scan(opts));

  // ── Settings (app-local) ──
  safeHandle("settings:get", () => settingsService.get());
  safeHandle("settings:update", (patch) => settingsService.update(patch));
  safeHandle("settings:list-models", (provider, baseUrl) =>
    settingsService.listModels(provider, baseUrl),
  );

  // ── Profile (prefs) ──
  safeHandle("profile:prefs", () => profileService.getPrefs());
  safeHandle("profile:set-target-roles", (roles: string[]) => profileService.setTargetRoles(roles));
  safeHandle("profile:update", (patch) => profileService.update(patch));
}
