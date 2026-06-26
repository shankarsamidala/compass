import { contextBridge, ipcRenderer } from "electron";
import type { CompassApi } from "@compass/ipc-contract";

// The typed bridge. Renderer reaches main ONLY through window.compass (via lib/ipc).
const api: CompassApi = {
  version: "0.1.0",
  auth: {
    signup: (email, password) => ipcRenderer.invoke("auth:signup", email, password),
    verifyEmail: (email, otp) => ipcRenderer.invoke("auth:verify-email", email, otp),
    resendOtp: (email) => ipcRenderer.invoke("auth:resend-otp", email),
    login: (email, password) => ipcRenderer.invoke("auth:login", email, password),
    forgotPassword: (email) => ipcRenderer.invoke("auth:forgot-password", email),
    resetPassword: (email, otp, password) =>
      ipcRenderer.invoke("auth:reset-password", email, otp, password),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getSession: () => ipcRenderer.invoke("auth:session"),
  },
  onboarding: {
    status: () => ipcRenderer.invoke("onboarding:status"),
    complete: () => ipcRenderer.invoke("onboarding:complete"),
    submit: (data) => ipcRenderer.invoke("onboarding:submit", data),
    importResume: (cvText) => ipcRenderer.invoke("onboarding:import-resume", cvText),
  },
  suggest: {
    query: (kind, q) => ipcRenderer.invoke("suggest:query", kind, q),
  },
  llm: {
    optimizeProofPoint: (draft, metric) => ipcRenderer.invoke("llm:optimize-proof-point", draft, metric),
    extractProofPoints: (resumeText?: string) => ipcRenderer.invoke("llm:extract-proof-points", resumeText),
    generateAbout: (headline, bio) => ipcRenderer.invoke("llm:generate-about", headline, bio),
    writeJobDescription: (company, title, draft) =>
      ipcRenderer.invoke("llm:write-job-description", company, title, draft),
  },
  document: {
    extractText: (fileName, bytes) => ipcRenderer.invoke("document:extract", fileName, bytes),
  },
  cv: {
    uploadFile: (fileName, bytes) => ipcRenderer.invoke("cv:upload-file", fileName, bytes),
    listUploads: () => ipcRenderer.invoke("cv:list-uploads"),
    deleteUpload: (id) => ipcRenderer.invoke("cv:delete-upload", id),
  },
  jobs: {
    list: (opts?: { limit?: number; offset?: number; days?: number }) => ipcRenderer.invoke("jobs:list", opts),
    get: (id) => ipcRenderer.invoke("jobs:get", id),
    scan: (opts) => ipcRenderer.invoke("jobs:scan", opts),
    evaluateQuick: (id) => ipcRenderer.invoke("jobs:evaluate-quick", id),
    evaluate: (id) => ipcRenderer.invoke("jobs:evaluate", id),
    evaluateAgent: (id) => ipcRenderer.invoke("jobs:evaluate-agent", id),
    rankScan: () => ipcRenderer.invoke("jobs:rank-scan"),
    rankSelected: (jobIds: string[]) => ipcRenderer.invoke("jobs:rank-selected", jobIds),
    tailorResume: (id: string) => ipcRenderer.invoke("jobs:tailor-resume", id),
    coverLetter: (id: string) => ipcRenderer.invoke("jobs:cover-letter", id),
    onRankProgress: (cb) => {
      const listener = (_e: unknown, line: string) => cb(line);
      ipcRenderer.on("jobs:rank-progress", listener);
      return () => ipcRenderer.removeListener("jobs:rank-progress", listener);
    },
    rankings: () => ipcRenderer.invoke("jobs:rankings"),
    notInterested: (jobIds: string[]) => ipcRenderer.invoke("jobs:not-interested", jobIds),
  },
  cli: {
    configure: () => ipcRenderer.invoke("cli:configure"),
    configureWithToken: (token) => ipcRenderer.invoke("cli:configure-with-token", token),
    status: () => ipcRenderer.invoke("cli:status"),
    detect: () => ipcRenderer.invoke("cli:detect"),
    install: () => ipcRenderer.invoke("cli:install"),
    isAgentTrusted: () => ipcRenderer.invoke("cli:agent-trusted"),
    trustAgent: () => ipcRenderer.invoke("cli:trust-agent"),
  },
  evaluations: {
    list: () => ipcRenderer.invoke("evaluations:list"),
    get: (id) => ipcRenderer.invoke("evaluations:get", id),
  },
  artifact: {
    open: (path: string) => ipcRenderer.invoke("artifact:open", path),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (patch) => ipcRenderer.invoke("settings:update", patch),
    listModels: (provider, baseUrl) => ipcRenderer.invoke("settings:list-models", provider, baseUrl),
  },
  profile: {
    getPrefs: () => ipcRenderer.invoke("profile:prefs"),
    setTargetRoles: (roles) => ipcRenderer.invoke("profile:set-target-roles", roles),
    update: (patch) => ipcRenderer.invoke("profile:update", patch),
  },
  skills: {
    list: () => ipcRenderer.invoke("skills:list"),
    add: (input) => ipcRenderer.invoke("skills:add", input),
    update: (id, patch) => ipcRenderer.invoke("skills:update", id, patch),
    remove: (id) => ipcRenderer.invoke("skills:remove", id),
    importFromExperiences: () => ipcRenderer.invoke("skills:import-from-experiences"),
  },
  education: {
    list: () => ipcRenderer.invoke("education:list"),
    add: (input) => ipcRenderer.invoke("education:add", input),
    update: (id, patch) => ipcRenderer.invoke("education:update", id, patch),
    remove: (id) => ipcRenderer.invoke("education:remove", id),
  },
  certifications: {
    list: () => ipcRenderer.invoke("certifications:list"),
    add: (input) => ipcRenderer.invoke("certifications:add", input),
    update: (id, patch) => ipcRenderer.invoke("certifications:update", id, patch),
    remove: (id) => ipcRenderer.invoke("certifications:remove", id),
  },
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    add: (input) => ipcRenderer.invoke("projects:add", input),
    update: (id, patch) => ipcRenderer.invoke("projects:update", id, patch),
    remove: (id) => ipcRenderer.invoke("projects:remove", id),
  },
  experience: {
    list: () => ipcRenderer.invoke("experience:list"),
    add: (input) => ipcRenderer.invoke("experience:add", input),
    update: (id, patch) => ipcRenderer.invoke("experience:update", id, patch),
    remove: (id) => ipcRenderer.invoke("experience:remove", id),
  },
  proofPoints: {
    list: () => ipcRenderer.invoke("proofPoints:list"),
    add: (input) => ipcRenderer.invoke("proofPoints:add", input),
    update: (id, patch) => ipcRenderer.invoke("proofPoints:update", id, patch),
    remove: (id) => ipcRenderer.invoke("proofPoints:remove", id),
  },
};

contextBridge.exposeInMainWorld("compass", api);

// PTY bridge — used by the Agent Terminal panel
contextBridge.exposeInMainWorld("pty", {
  detect: () => ipcRenderer.invoke("pty:detect"),
  spawn: (agentId: string, cols: number, rows: number) =>
    ipcRenderer.send("pty:spawn", agentId, cols, rows),
  write: (data: string) => ipcRenderer.send("pty:write", data),
  resize: (cols: number, rows: number) => ipcRenderer.send("pty:resize", cols, rows),
  kill: () => ipcRenderer.send("pty:kill"),
  onData: (cb: (data: string) => void) => {
    const listener = (_e: unknown, data: string) => cb(data);
    ipcRenderer.on("pty:data", listener);
    return () => ipcRenderer.removeListener("pty:data", listener);
  },
  onExit: (cb: (code: number) => void) => {
    const listener = (_e: unknown, code: number) => cb(code);
    ipcRenderer.on("pty:exit", listener);
    return () => ipcRenderer.removeListener("pty:exit", listener);
  },
});
