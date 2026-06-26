import { BrowserWindow, ipcMain, shell } from "electron";
import type { ScanSource } from "@compass/ipc-contract";
import { safeHandle } from "../core/ipc";
import { ptyService } from "../services/pty.service";
import type { AgentId } from "../services/pty.service";
import { profileSync } from "../services/profile-sync-state";
import { authService } from "../services/auth.service";
import { cliService } from "../services/cli.service";
import { evaluationsService } from "../services/evaluations.service";
import { onboardingService } from "../services/onboarding.service";
import { cvService } from "../services/cv.service";
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
  // Wrap a handler so it flags the local profile stale before running. Used on
  // profile-affecting mutations so the next agent run re-syncs (get-profile).
  const dirtying =
    <A extends any[], R>(fn: (...args: A) => R) =>
    (...args: A): R => {
      profileSync.markDirty();
      return fn(...args);
    };
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
  safeHandle("onboarding:submit", dirtying((data) => onboardingService.submit(data)));
  safeHandle("onboarding:import-resume", dirtying((cvText) => onboardingService.importResume(cvText)));

  // ── Suggest (autocomplete) ──
  safeHandle("suggest:query", (kind, q) => suggestService.query(kind, q));

  // ── LLM (BYO-LLM, local inference) ──
  safeHandle("llm:optimize-proof-point", (draft: string, metric?: string) =>
    llmService.optimizeProofPoint(draft, metric),
  );
  safeHandle("llm:extract-proof-points", (resumeText?: string) =>
    llmService.extractProofPoints(resumeText),
  );
  safeHandle("llm:generate-about", (headline?: string, bio?: string) =>
    llmService.generateAbout(headline, bio),
  );
  safeHandle("llm:write-job-description", (company: string, title: string, draft?: string) =>
    llmService.writeJobDescription(company, title, draft),
  );

  // ── Document (local file → text) ──
  safeHandle("document:extract", (fileName: string, bytes: Uint8Array) =>
    documentService.extractText(fileName, bytes),
  );
  safeHandle("cv:upload-file", dirtying((fileName: string, bytes: Uint8Array) =>
    cvService.uploadFile(fileName, bytes),
  ));
  safeHandle("cv:list-uploads", () => cvService.listUploads());
  safeHandle("cv:delete-upload", (id: string) => cvService.deleteUpload(id));

  // ── Jobs (feed + detail + scan) ──
  safeHandle("jobs:list", (opts?: { limit?: number; offset?: number; days?: number }) => jobsService.list(opts));
  safeHandle("jobs:get", (id: string) => jobsService.get(id));
  safeHandle("jobs:scan", (opts: { maxPerRole: number; jobAge: number; sources: ScanSource[] }) => jobsService.scan(opts));
  safeHandle("jobs:evaluate-quick", (id: string) => jobsService.evaluateQuick(id));
  safeHandle("jobs:evaluate", (id: string) => jobsService.evaluate(id));
  safeHandle("jobs:evaluate-agent", (id: string) => jobsService.evaluateViaAgent(id));
  safeHandle("jobs:rank-scan", () =>
    jobsService.rankScanViaAgent((line) => {
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send("jobs:rank-progress", line);
    }),
  );
  safeHandle("jobs:rank-selected", (jobIds: string[]) =>
    jobsService.rankSelectedViaAgent(jobIds, (line) => {
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send("jobs:rank-progress", line);
    }),
  );
  safeHandle("jobs:tailor-resume", (id: string) => jobsService.tailorResumeViaAgent(id));
  safeHandle("jobs:cover-letter", (id: string) => jobsService.coverLetterViaAgent(id));
  safeHandle("jobs:rankings", () => jobsService.listRankings());
  safeHandle("jobs:not-interested", (jobIds: string[]) => jobsService.notInterested(jobIds));

  // ── Artifacts (open a locally-generated file in the OS default app) ──
  safeHandle("artifact:open", async (path: string) => {
    const e = await shell.openPath(path); // returns "" on success, else an error string
    return e ? { ok: false as const, error: e, code: "OPEN_FAILED" } : { ok: true as const, data: {} };
  });

  // ── Settings (app-local) ──
  // ── REINIT CLI (REIN-319) ──
  safeHandle("cli:configure", () => cliService.configure());
  safeHandle("cli:configure-with-token", (token: string) => cliService.configureWithToken(token));
  safeHandle("cli:status", () => cliService.status());
  safeHandle("cli:detect", () => cliService.detect());
  safeHandle("cli:install", () => cliService.install());
  safeHandle("cli:agent-trusted", () => cliService.isAgentTrusted());
  safeHandle("cli:trust-agent", () => cliService.trustAgent());

  // ── Evaluations dashboard (REIN-320) ──
  safeHandle("evaluations:list", () => evaluationsService.list());
  safeHandle("evaluations:get", (id: string) => evaluationsService.get(id));
  safeHandle("evaluations:remove", (id: string) => evaluationsService.remove(id));

  safeHandle("settings:get", () => settingsService.get());
  safeHandle("settings:update", (patch) => settingsService.update(patch));
  safeHandle("settings:list-models", (provider, baseUrl) =>
    settingsService.listModels(provider, baseUrl),
  );

  // ── Profile (prefs) ──
  safeHandle("profile:prefs", () => profileService.getPrefs());
  safeHandle("profile:set-target-roles", dirtying((roles: string[]) => profileService.setTargetRoles(roles)));
  safeHandle("profile:update", dirtying((patch) => profileService.update(patch)));

  // ── Skills (stack & tools) ──
  safeHandle("skills:list", () => skillsService.list());
  safeHandle("skills:add", dirtying((input) => skillsService.add(input)));
  safeHandle("skills:update", dirtying((id: string, patch) => skillsService.update(id, patch)));
  safeHandle("skills:remove", dirtying((id: string) => skillsService.remove(id)));
  safeHandle("skills:import-from-experiences", dirtying(() => skillsService.importFromExperiences()));

  // ── Education ──
  safeHandle("education:list", () => educationService.list());
  safeHandle("education:add", dirtying((input) => educationService.add(input)));
  safeHandle("education:update", dirtying((id: string, patch) => educationService.update(id, patch)));
  safeHandle("education:remove", dirtying((id: string) => educationService.remove(id)));

  safeHandle("certifications:list", () => certificationsService.list());
  safeHandle("certifications:add", dirtying((input) => certificationsService.add(input)));
  safeHandle("certifications:update", dirtying((id: string, patch) => certificationsService.update(id, patch)));
  safeHandle("certifications:remove", dirtying((id: string) => certificationsService.remove(id)));

  safeHandle("projects:list", () => projectsService.list());
  safeHandle("projects:add", dirtying((input) => projectsService.add(input)));
  safeHandle("projects:update", dirtying((id: string, patch) => projectsService.update(id, patch)));
  safeHandle("projects:remove", dirtying((id: string) => projectsService.remove(id)));

  // ── Experiences ──
  safeHandle("experience:list", () => experienceService.list());
  safeHandle("experience:add", dirtying((input) => experienceService.add(input)));
  safeHandle("experience:update", dirtying((id: string, patch) => experienceService.update(id, patch)));
  safeHandle("experience:remove", dirtying((id: string) => experienceService.remove(id)));

  // ── Proof points (hot takes + achievements) ──
  safeHandle("proofPoints:list", () => proofPointsService.list());
  safeHandle("proofPoints:add", dirtying((input) => proofPointsService.add(input)));
  safeHandle("proofPoints:update", dirtying((id: string, patch) => proofPointsService.update(id, patch)));
  safeHandle("proofPoints:remove", dirtying((id: string) => proofPointsService.remove(id)));

  // ── PTY / Agent terminal ──
  ipcMain.handle("pty:detect", async () => ptyService.detectAgents());

  // Wire data forwarding once — broadcast to all windows (there's only one).
  // This avoids BrowserWindow.fromWebContents() returning null on some Electron builds.
  ptyService.onData((data) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("pty:data", data);
    }
  });
  ptyService.onExit((code) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("pty:exit", code);
    }
  });

  ipcMain.on("pty:spawn", (_e, agentId: AgentId, cols: number, rows: number) => {
    // Test: send a message directly so we know main→renderer IPC works
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("pty:data", `\r\n\x1b[35m[main: spawn ${agentId} ${cols}×${rows}]\x1b[0m\r\n`);
    }
    ptyService.spawn(agentId, cols, rows);
  });
  ipcMain.on("pty:write",  (_e, data: string)                                  => ptyService.write(data));
  ipcMain.on("pty:resize", (_e, cols: number, rows: number)                    => ptyService.resize(cols, rows));
  ipcMain.on("pty:kill",   ()                                                   => ptyService.kill());
}
