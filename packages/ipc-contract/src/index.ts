/**
 * @compass/ipc-contract — the shared IPC boundary (ADR-0005).
 * Imported by apps/desktop/electron (main + preload) AND the renderer's lib/ipc,
 * so channel signatures + the result envelope have a single source of truth.
 */

/** The one envelope every IPC handler returns. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: string, code?: string): Result<never> => ({ ok: false, error, code });

// ── Auth domain ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  onboardingCompleted?: boolean;
}

export interface SessionData {
  user: AuthUser;
  profile?: unknown;
}

/** Success payloads carry the API's human message where useful (notices). */
export interface AuthApi {
  signup(email: string, password: string): Promise<Result<{ userId?: string; message?: string }>>;
  verifyEmail(email: string, otp: string): Promise<Result<{ message?: string }>>;
  resendOtp(email: string): Promise<Result<{ message?: string }>>;
  login(email: string, password: string): Promise<Result<AuthUser>>;
  forgotPassword(email: string): Promise<Result<{ message?: string }>>;
  resetPassword(email: string, otp: string, password: string): Promise<Result<{ message?: string }>>;
  logout(): Promise<Result<{ message?: string }>>;
  getSession(): Promise<Result<SessionData>>;
}

// ── Onboarding domain ────────────────────────────────────────────────────────

/** API-shaped profile fields (PUT /profile). Renderer maps the form onto this. */
export interface OnboardingProfile {
  fullName?: string;
  location?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolioUrl?: string;
  targetRoles?: string[];
  employmentType?: string;
  openToRemote?: boolean;
  openToRelocate?: boolean;
  preferredLocations?: string[];
  totalExperienceYears?: number;
  currentCompany?: string;
  currentDesignation?: string;
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriod?: number;
  currentlyServingNotice?: boolean;
  highestQualification?: string;
  graduationYear?: number;
}
export interface OnboardingExperience {
  company: string;
  title: string;
  location?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  skills?: string[];
  bullets?: string[];
}
export interface OnboardingEducation {
  institution: string;
  level?: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
  isCurrent: boolean;
  cgpa?: number;
  percentage?: number;
}
export interface OnboardingProject {
  title: string;
  description?: string;
  techStack?: string[];
  url?: string;
}
export interface OnboardingProofPoint {
  title: string;
  metrics?: string;
  url?: string;
}
/** Full onboarding payload — the renderer assembles this; main orchestrates persistence. */
export interface OnboardingSubmit {
  profile: OnboardingProfile;
  experiences: OnboardingExperience[];
  education: OnboardingEducation[];
  projects: OnboardingProject[];
  proofPoints: OnboardingProofPoint[];
}

export interface OnboardingApi {
  status(): Promise<Result<{ onboardingCompleted: boolean }>>;
  complete(): Promise<Result<{ onboardingCompleted: boolean }>>;
  /** Idempotent: PUT profile → replace records → mark complete. */
  submit(data: OnboardingSubmit): Promise<Result<{ onboardingCompleted: boolean }>>;
}

// ── Suggest domain (autocomplete) ────────────────────────────────────────────

/** What kind of free-text field is being completed. Maps to a provider in main. */
export type SuggestKind = "locations" | "roles";

export interface SuggestApi {
  /** Typeahead suggestions for a field. Always resolves (failures → empty list). */
  query(kind: SuggestKind, q: string): Promise<Result<string[]>>;
}

// ── LLM domain (BYO-LLM: server prompts, local inference) ────────────────────

export interface LlmApi {
  /** Rewrite a rough proof-point draft into a polished line + extracted metric, via local Ollama. */
  optimizeProofPoint(draft: string, metric?: string): Promise<Result<{ text: string; metric: string }>>;
  /** Extract candidate proof points from resume text, via local Ollama. */
  extractProofPoints(resumeText: string): Promise<Result<{ points: { title: string; metric: string }[] }>>;
  /** Generate or refine a profile headline + bio, via local Ollama. */
  generateAbout(headline?: string, bio?: string): Promise<Result<{ headline: string; bio: string }>>;
}

// ── Document domain (local file → text) ──────────────────────────────────────

export interface DocumentApi {
  /** Extract plain text from a PDF/DOCX/text file (bytes from File.arrayBuffer()). */
  extractText(fileName: string, bytes: Uint8Array): Promise<Result<{ text: string }>>;
}

// ── Jobs domain ──────────────────────────────────────────────────────────────

/** A pooled job as the feed/detail returns it (career-ops GET /jobs[/:id]). */
export interface FeedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  source: string;
  jobUrl: string | null;
  jd: string | null;
  postedAt: string | null;
  /** Embedding fit 0–100 (null when no profile vector / Qdrant down). */
  score: number | null;
  /** Stored LLM quick-eval 0–100 + recommendation, if scored. */
  quickScore?: number | null;
  recommendation?: "Apply" | "Consider" | "Skip" | null;
}

export interface ScanResult {
  scannedRoles: number;
  inserted: number;
  refreshed: number;
  embedded: number;
  perRole: Array<{ role: string; found: number }>;
}

export interface JobsApi {
  /** The user's ranked feed (career-ops GET /jobs). */
  list(): Promise<Result<{ jobs: FeedJob[] }>>;
  /** A single pooled job for the detail page (GET /jobs/:id). */
  get(id: string): Promise<Result<{ job: FeedJob }>>;
  /** Scrape Naukri for the user's target roles and ingest into the pool (POST /jobs/scan). */
  scan(opts: { maxPerRole: number; jobAge: number }): Promise<Result<ScanResult>>;
}

// ── Settings domain (app-local, non-secret) ──────────────────────────────────

export type LlmProvider = "ollama";
export type ScanSource = "naukri" | "linkedin" | "indeed" | "greenhouse" | "lever";

export interface LlmSettings {
  provider: LlmProvider;
  ollamaUrl: string;
  ollamaModel: string;
}
export type MatchFloor = "all" | "fair" | "strong";
export interface ScanSettings {
  sources: ScanSource[];
  /** Max jobs pulled per target role per scan. */
  maxPerRole: number;
  /** Posting freshness filter in days. */
  jobAge: number;
  /** Minimum match band to show in the feed. */
  minMatch: MatchFloor;
}
export interface AppSettings {
  llm: LlmSettings;
  scan: ScanSettings;
}

export interface SettingsApi {
  get(): Promise<Result<AppSettings>>;
  /** Shallow-merge a partial patch; returns the full updated settings. */
  update(patch: Partial<AppSettings>): Promise<Result<AppSettings>>;
  /** Installed local models for a provider (Ollama /api/tags). Empty if unreachable. */
  listModels(provider: LlmProvider, baseUrl?: string): Promise<Result<{ models: string[] }>>;
}

// ── Profile domain (read-only prefs for the feed/job-search UI) ───────────────

/** The profile fields that shape the job feed (career-ops GET /profile). */
export interface ProfilePrefs {
  targetRoles: string[];
  location: string | null;
  totalExperienceYears: number | null;
  preferredLocations: string[];
  openToRemote: boolean;
  openToRelocate: boolean;
  employmentType: string | null;
  expectedCtc: number | null;
  headline: string | null;
  bio: string | null;
}

/** Profile fields the Job-preferences UI may write (subset of PUT /profile). */
export interface ProfilePatch {
  targetRoles?: string[];
  employmentType?: string;
  expectedCtc?: number;
  preferredLocations?: string[];
  openToRemote?: boolean;
  openToRelocate?: boolean;
  headline?: string;
  bio?: string;
}

export interface ProfileApi {
  /** The user's feed-shaping preferences. */
  getPrefs(): Promise<Result<ProfilePrefs>>;
  /** Replace the user's target roles (PUT /profile). Returns the updated prefs. */
  setTargetRoles(roles: string[]): Promise<Result<ProfilePrefs>>;
  /** Patch any of the feed-shaping profile fields (PUT /profile). */
  update(patch: ProfilePatch): Promise<Result<ProfilePrefs>>;
}

// ── Proof points domain ───────────────────────────────────────────────────────

export interface ProofPointItem {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  metrics: string | null;
  url: string | null;
  tags: string[] | null;
  createdAt: string;
}

export interface ProofPointInput {
  title: string;
  description?: string;
  metrics?: string;
  url?: string;
  tags?: string[];
}

export interface ProofPointsApi {
  list(): Promise<Result<ProofPointItem[]>>;
  add(input: ProofPointInput): Promise<Result<ProofPointItem>>;
  update(id: string, patch: Partial<ProofPointInput>): Promise<Result<ProofPointItem>>;
  remove(id: string): Promise<Result<void>>;
}

// ── Skills domain (stack & tools) ────────────────────────────────────────────

export type SkillSection = "Primary" | "Hobby" | "Learning" | "Past";

export interface SkillItem {
  id: string;
  profileId: string;
  skill: string;
  section: SkillSection;
  faviconUrl: string | null;
  sinceYear: number | null;
  sinceMonth: number | null;
  proficiency: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface SkillInput {
  skill: string;
  section: SkillSection;
  faviconUrl?: string | null;
  sinceYear?: number | null;
  sinceMonth?: number | null;
  proficiency?: string;
  sortOrder?: number;
}

export interface SkillsApi {
  list(): Promise<Result<{ data: SkillItem[] }>>;
  add(input: SkillInput): Promise<Result<SkillItem>>;
  update(id: string, patch: Partial<SkillInput>): Promise<Result<SkillItem>>;
  remove(id: string): Promise<Result<void>>;
  importFromExperiences(): Promise<Result<{ imported: number }>>;
}

// ── Education domain ─────────────────────────────────────────────────────────

export interface EducationItem {
  id: string;
  profileId: string;
  institution: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
  grade: string | null;
  percentage: string | null;  // pg numeric → string
  cgpa: string | null;        // pg numeric → string
  createdAt: string;
}

export interface EducationInput {
  institution: string;
  degree?: string;
  field?: string;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  isCurrent?: boolean;
  grade?: string | null;
  percentage?: number | null;
  cgpa?: number | null;
}

export interface EducationApi {
  list(): Promise<Result<{ data: EducationItem[] }>>;
  add(input: EducationInput): Promise<Result<EducationItem>>;
  update(id: string, patch: Partial<EducationInput>): Promise<Result<EducationItem>>;
  remove(id: string): Promise<Result<void>>;
}

// ── Certification domain ──────────────────────────────────────────────────────

export interface CertificationItem {
  id: string;
  profileId: string;
  name: string;
  issuer: string | null;
  issuerImage: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  url: string | null;
  description: string | null;
  createdAt: string;
}

export interface CertificationInput {
  name: string;
  issuer?: string;
  issuerImage?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
  description?: string;
}

export interface CertificationApi {
  list(): Promise<Result<{ data: CertificationItem[] }>>;
  add(input: CertificationInput): Promise<Result<CertificationItem>>;
  update(id: string, patch: Partial<CertificationInput>): Promise<Result<CertificationItem>>;
  remove(id: string): Promise<Result<void>>;
}

// ── Project domain ────────────────────────────────────────────────────────────

export interface ProjectItem {
  id: string;
  profileId: string;
  title: string;
  publisher: string | null;
  publisherImage: string | null;
  description: string | null;
  techStack: string[] | null;
  role: string | null;
  url: string | null;
  repoUrl: string | null;
  metrics: string | null;
  featured: boolean;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface ProjectInput {
  title: string;
  publisher?: string;
  publisherImage?: string;
  description?: string;
  techStack?: string[];
  role?: string;
  url?: string;
  repoUrl?: string;
  metrics?: string;
  featured?: boolean;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ProjectApi {
  list(): Promise<Result<{ data: ProjectItem[] }>>;
  add(input: ProjectInput): Promise<Result<ProjectItem>>;
  update(id: string, patch: Partial<ProjectInput>): Promise<Result<ProjectItem>>;
  remove(id: string): Promise<Result<void>>;
}

// ── Experience domain ─────────────────────────────────────────────────────────

export type ExperienceEmploymentType = "permanent" | "contract" | "c2h" | "internship" | "freelance";

export type ExperienceLocationType = "remote" | "hybrid" | "onsite";

export interface ExperienceItem {
  id: string;
  profileId: string;
  company: string;
  domain: string | null;
  companyImage: string | null;
  title: string;
  location: string | null;
  locationType: ExperienceLocationType | null;
  employmentType: ExperienceEmploymentType | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  skills: string[] | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceInput {
  company: string;
  domain?: string;
  companyImage?: string;
  title: string;
  location?: string;
  locationType?: ExperienceLocationType;
  employmentType?: ExperienceEmploymentType;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  skills?: string[];
  sortOrder?: number;
}

export interface ExperienceApi {
  list(): Promise<Result<{ data: ExperienceItem[] }>>;
  add(input: ExperienceInput): Promise<Result<ExperienceItem>>;
  update(id: string, patch: Partial<ExperienceInput>): Promise<Result<ExperienceItem>>;
  remove(id: string): Promise<Result<void>>;
}

/** The full bridge exposed on `window.compass`. Grows as features land. */
export interface CompassApi {
  version: string;
  auth: AuthApi;
  onboarding: OnboardingApi;
  suggest: SuggestApi;
  llm: LlmApi;
  document: DocumentApi;
  jobs: JobsApi;
  settings: SettingsApi;
  profile: ProfileApi;
  skills: SkillsApi;
  proofPoints: ProofPointsApi;
  education: EducationApi;
  certifications: CertificationApi;
  projects: ProjectApi;
  experience: ExperienceApi;
}
