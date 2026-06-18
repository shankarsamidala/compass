import { safeHandle } from "../core/ipc";
import { authService } from "../services/auth.service";
import { onboardingService } from "../services/onboarding.service";
import { suggestService } from "../services/suggest.service";
import { llmService } from "../services/llm.service";
import { documentService } from "../services/document.service";
import { jobsService } from "../services/jobs.service";
import { settingsService } from "../services/settings.service";
import { profileService } from "../services/profile.service";
import { skillsService } from "../services/skills.service";
import { proofPointsService } from "../services/proof-points.service";
import { educationService } from "../services/education.service";
import { certificationsService } from "../services/certifications.service";
import { projectsService } from "../services/projects.service";
import { experienceService } from "../services/experience.service";

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
  safeHandle("onboarding:import-resume", (cvText) => onboardingService.importResume(cvText));

  // ── Suggest (autocomplete) ──
  safeHandle("suggest:query", (kind, q) => suggestService.query(kind, q));

  // ── LLM (BYO-LLM, local inference) ──
  safeHandle("llm:optimize-proof-point", (draft: string, metric?: string) =>
    llmService.optimizeProofPoint(draft, metric),
  );
  safeHandle("llm:extract-proof-points", (resumeText: string) =>
    llmService.extractProofPoints(resumeText),
  );
  safeHandle("llm:generate-about", (headline?: string, bio?: string) =>
    llmService.generateAbout(headline, bio),
  );

  // ── Document (local file → text) ──
  safeHandle("document:extract", (fileName: string, bytes: Uint8Array) =>
    documentService.extractText(fileName, bytes),
  );

  // ── Jobs (feed + detail + scan) ──
  safeHandle("jobs:list", () => jobsService.list());
  safeHandle("jobs:get", (id: string) => jobsService.get(id));
  safeHandle("jobs:scan", (opts: { maxPerRole: number; jobAge: number }) => jobsService.scan(opts));
  safeHandle("jobs:evaluate-quick", (id: string) => jobsService.evaluateQuick(id));
  safeHandle("jobs:evaluate", (id: string) => jobsService.evaluate(id));

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

  // ── Skills (stack & tools) ──
  safeHandle("skills:list", () => skillsService.list());
  safeHandle("skills:add", (input) => skillsService.add(input));
  safeHandle("skills:update", (id: string, patch) => skillsService.update(id, patch));
  safeHandle("skills:remove", (id: string) => skillsService.remove(id));
  safeHandle("skills:import-from-experiences", () => skillsService.importFromExperiences());

  // ── Education ──
  safeHandle("education:list", () => educationService.list());
  safeHandle("education:add", (input) => educationService.add(input));
  safeHandle("education:update", (id: string, patch) => educationService.update(id, patch));
  safeHandle("education:remove", (id: string) => educationService.remove(id));

  safeHandle("certifications:list", () => certificationsService.list());
  safeHandle("certifications:add", (input) => certificationsService.add(input));
  safeHandle("certifications:update", (id: string, patch) => certificationsService.update(id, patch));
  safeHandle("certifications:remove", (id: string) => certificationsService.remove(id));

  safeHandle("projects:list", () => projectsService.list());
  safeHandle("projects:add", (input) => projectsService.add(input));
  safeHandle("projects:update", (id: string, patch) => projectsService.update(id, patch));
  safeHandle("projects:remove", (id: string) => projectsService.remove(id));

  // ── Experiences ──
  safeHandle("experience:list", () => experienceService.list());
  safeHandle("experience:add", (input) => experienceService.add(input));
  safeHandle("experience:update", (id: string, patch) => experienceService.update(id, patch));
  safeHandle("experience:remove", (id: string) => experienceService.remove(id));

  // ── Proof points (hot takes + achievements) ──
  safeHandle("proofPoints:list", () => proofPointsService.list());
  safeHandle("proofPoints:add", (input) => proofPointsService.add(input));
  safeHandle("proofPoints:update", (id: string, patch) => proofPointsService.update(id, patch));
  safeHandle("proofPoints:remove", (id: string) => proofPointsService.remove(id));
}
