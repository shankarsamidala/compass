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
    extractProofPoints: (resumeText) => ipcRenderer.invoke("llm:extract-proof-points", resumeText),
    generateAbout: (headline, bio) => ipcRenderer.invoke("llm:generate-about", headline, bio),
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
    list: () => ipcRenderer.invoke("jobs:list"),
    get: (id) => ipcRenderer.invoke("jobs:get", id),
    scan: (opts) => ipcRenderer.invoke("jobs:scan", opts),
    evaluateQuick: (id) => ipcRenderer.invoke("jobs:evaluate-quick", id),
    evaluate: (id) => ipcRenderer.invoke("jobs:evaluate", id),
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
