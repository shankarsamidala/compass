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
  description?: string;
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
  /** Raw text extracted from the uploaded resume (step 7). If present, main calls POST /cv/import after saving wizard records. */
  resumeText?: string;
}

export interface CvImportResult {
  imported: { experiences: number; education: number; certifications: number; projects: number };
  reviewFlags: string[];
}

export interface OnboardingApi {
  status(): Promise<Result<{ onboardingCompleted: boolean }>>;
  complete(): Promise<Result<{ onboardingCompleted: boolean }>>;
  /** Idempotent: PUT profile → replace records → mark complete. */
  submit(data: OnboardingSubmit): Promise<Result<{ onboardingCompleted: boolean }>>;
  /** Parse a resume → structured records (agent → Ollama). Omit cvText to re-parse the stored resume. */
  importResume(cvText?: string): Promise<Result<CvImportResult>>;
  /** Setup step 2 — persist the user's selected goals (multi-select; personalization / training). */
  saveGoals(goals: string[]): Promise<Result<{ goals: string[] }>>;
  /** Setup step 3 — persist data-use + marketing consents (safety record). */
  saveConsent(input: { dataUse: boolean; marketingEmail: boolean }): Promise<Result<{ dataUse: boolean; marketingEmail: boolean }>>;
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
  /** Rewrite a rough proof-point draft into a polished line + extracted metric (agent → Ollama). */
  optimizeProofPoint(draft: string, metric?: string): Promise<Result<{ text: string; metric: string }>>;
  /** Extract proof points from resume text; omit to use the stored CV dump (agent → Ollama). */
  extractProofPoints(resumeText?: string): Promise<Result<{ points: { title: string; metric: string }[] }>>;
  /** Generate or refine a profile headline + bio, grounded in the stored resume (agent → Ollama). */
  generateAbout(headline?: string, bio?: string): Promise<Result<{ headline: string; bio: string }>>;
  /** Write/rewrite one job's description from the stored resume (agent → Ollama). */
  writeJobDescription(company: string, title: string, draft?: string): Promise<Result<{ text: string }>>;
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
  logoUrl: string | null;
  postedAt: string | null;
  /** Embedding fit 0–100 (null when no profile vector / Qdrant down). */
  score: number | null;
  /** Stored LLM quick-eval 0–100 + recommendation, if scored. */
  quickScore?: number | null;
  recommendation?: "Apply" | "Consider" | "Skip" | null;
}

// ── Canonical scraped job ────────────────────────────────────────────────────
// The single portal-agnostic shape every scraper adapter (Naukri, Hirist,
// Instahyre, …) maps its raw response into, before ingest into the global pool
// (co_jobs). Every enrichment field is optional — each portal fills what it has:
//   • salary band (ctc*) — Naukri/Hirist via AmbitionBox; Instahyre: none
//   • applicants / postedAt — Naukri/Hirist; Instahyre: none
//   • companyRating — Naukri/Hirist AmbitionBox; Instahyre Glassdoor
// Scanning always runs on the user's machine (their IP); this is the payload
// shipped to POST /jobs/user-ingest.
export type JobSource = "naukri" | "hirist" | "instahyre" | (string & {});

/** One parsed JD section — preserves heading + bullets instead of a flat blob. */
export interface JdSection {
  heading: string | null;
  items: string[];
}

export interface CanonicalJob {
  source: JobSource;
  /** Portal's own job id (for dedupe/debug). */
  externalId: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string | null;
  logoUrl: string | null;
  postedAt: string | null; // ISO date; null when the portal omits it (e.g. Instahyre)
  // role / experience
  expMin: number | null;
  expMax: number | null;
  workMode: string | null; // onsite | hybrid | remote
  employmentType: string | null;
  seniority: string | null;
  // skills
  skills: string[]; // flat list (drives deterministic match)
  skillsMeta: Array<{ name: string; mandatory: boolean }> | null;
  // description
  jd: string | null; // full text/HTML
  jdStructured: JdSection[] | null;
  // compensation
  salaryDisclosed: boolean | null;
  salaryMin: number | null; // from the JD (LPA)
  salaryMax: number | null;
  ctcMin: number | null; // AmbitionBox/Glassdoor band (LPA)
  ctcMax: number | null;
  ctcAvg: number | null;
  // demand
  applicants: number | null;
  // company enrichment
  companyRating: number | null; // AmbitionBox or Glassdoor overall
  companyReviewsCount: number | null;
  companyType: string | null;
  companySize: string | null;
  industry: string | null;
  aboutCompany: string | null;
  benefits: string[] | null;
}

export interface ScanResult {
  scannedRoles: number;
  inserted: number;
  refreshed: number;
  embedded: number;
  perRole: Array<{ role: string; found: number }>;
}

// ── Job evaluation (career-ops Blocks A–G) ───────────────────────────────────

export type EvalRecommendation = "apply" | "consider" | "skip";
export type LegitimacyTier = "High Confidence" | "Proceed with Caution" | "Suspicious";

export interface EvalBlockA {
  archetype?: string; domain?: string; function?: string;
  seniority?: string; remote?: string; team_size?: string; tldr?: string;
}
export interface EvalRequirement {
  jd_requirement: string; jd_required: boolean;
  match: "exact" | "adjacent" | "none"; evidence: string;
}
export interface EvalGap {
  requirement: string; hard_blocker: boolean; learnable: boolean;
  learning_curve?: string; adjacent_skill?: string; mitigation: string;
}
export interface EvalBlockB {
  requirements_map: EvalRequirement[];
  gaps: EvalGap[];
  overall_match_pct: number;
}
export interface EvalBlockC {
  level_detected: string; level_candidate: string;
  sell_senior_plan: string[]; downlevel_plan?: string;
}
export interface EvalSalary { source: string; range: string; level?: string; currency?: string; }
export interface EvalBlockD {
  salary_data: EvalSalary[]; demand_trend: string; company_comp_reputation?: string;
}
export interface EvalChange {
  section: string; current: string; proposed: string; why: string;
  /** true = only uses skills already in the profile; false = hallucination risk. */
  evidence_based: boolean;
}
export interface EvalBlockE {
  cv_changes: EvalChange[]; linkedin_changes: EvalChange[];
}
export interface EvalStory {
  jd_requirement: string; title: string;
  situation: string; task: string; action: string; result: string; reflection: string;
}
export interface EvalBlockF {
  stories: EvalStory[];
  case_study?: { project: string; why: string; how_to_present: string };
  red_flag_qa?: Array<{ question: string; answer: string }>;
}
export interface EvalSignal {
  signal: string; finding: string; weight: "Positive" | "Neutral" | "Concerning";
}
export interface EvalBlockG {
  assessment_tier: LegitimacyTier; signals: EvalSignal[]; context_notes?: string;
}
export interface EvalMachineSummary {
  recommendation: EvalRecommendation;
  score?: number;
  top_gaps?: string[];
  top_strengths?: string[];
  seniority?: string;
  remote?: string;
  risk_level?: string;
  domain?: string;
  confidence?: number;
  next_action?: string;
}
/** Normalized job evaluation (quick = partial, full = complete). */
export interface JobEvaluation {
  id: string;
  jobId?: string;
  status: "partial" | "complete";
  score: number;              // 1–5
  archetype: string;
  legitimacyTier: LegitimacyTier | null;
  recommendation: EvalRecommendation;
  machineSummary: EvalMachineSummary;
  blocks: {
    a?: EvalBlockA; b?: EvalBlockB; c?: EvalBlockC; d?: EvalBlockD;
    e?: EvalBlockE; f?: EvalBlockF; g?: EvalBlockG;
  };
  rawReport?: string;
}

/** Per-user ofertas triage ranking for a pooled job (GET /rankings). */
export interface JobRanking {
  jobId: string;
  score: string | null;        // numeric comes back as string from pg
  rank: number | null;
  legitimacy: string | null;
  recommendation: string | null;
  reasoning: string | null;
  dimensions: Record<string, number> | null; // {northStar:4, cvMatch:3, ...}
  createdAt: string;
}

export interface JobsApi {
  /** The user's ranked feed (career-ops GET /jobs). `days` (1–90) is the freshness
   *  window the user picks; omitted → falls back to the scan jobAge setting. */
  list(opts?: { limit?: number; offset?: number; days?: number }): Promise<Result<{ jobs: FeedJob[] }>>;
  /** A single pooled job for the detail page (GET /jobs/:id). */
  get(id: string): Promise<Result<{ job: FeedJob }>>;
  /** Scrape the enabled portals (user-side) for the user's target roles and ingest into the pool. */
  scan(opts: { maxPerRole: number; maxPages: number; jobAge: number; sources: ScanSource[] }): Promise<Result<ScanResult>>;
  /** Fast triage pass for a pooled job (POST /jobs/:id/evaluate/quick). */
  evaluateQuick(id: string): Promise<Result<JobEvaluation>>;
  /** Decision-view eval for a pooled job — per-block B/C/D/G, web-grounded D/G (POST /jobs/:id/evaluate/blocks). */
  evaluate(id: string): Promise<Result<JobEvaluation>>;
  /** Evaluate a job by running the reinit skill headless (claude -p) → pushes to /evaluations. */
  evaluateAgent(id: string): Promise<Result<{ result: string }>>;
  /** Run ofertas (claude -p) on the freshly-scanned pool → save per-user rankings. */
  rankScan(): Promise<Result<{ saved: number }>>;
  /** Write JD files for the given job IDs (max 25) and run ofertas on just those. */
  rankSelected(jobIds: string[]): Promise<Result<{ saved: number }>>;
  /** Tailor a resume for one job (reinit `pdf` mode tailoring, claude -p) → store it as
   *  PremiumResumeData JSON (POST /tailored-cv). PDF rendering is held; returns the
   *  ATS keyword-coverage %. */
  tailorResume(id: string): Promise<Result<{ saved: boolean; keywordCoverage: number | null }>>;
  /** The caller's stored tailored resume for one job (GET /tailored-cv/:jobId), or null if
   *  none has been generated yet. `resumeJson` is the PremiumResumeData shape. */
  getTailoredCv(id: string): Promise<Result<{ tailoredCv: TailoredCv | null }>>;
  /** Draft a cover letter for one job (reinit `cover` mode, claude -p) → persists it
   *  (POST /cover-letter). Returns the letter text. */
  coverLetter(id: string): Promise<Result<{ letter: string }>>;
  /** The caller's stored cover letter for one job (GET /cover-letter/:jobId), or null. */
  getCoverLetter(id: string): Promise<Result<{ letter: string | null }>>;
  /** Live progress lines emitted while rankScan runs (agent stdout summaries).
   *  Returns an unsubscribe fn. Used to show which job is being read in the loader. */
  onRankProgress(cb: (line: string) => void): () => void;
  /** The caller's stored ofertas rankings, to merge into the table. */
  rankings(): Promise<Result<{ rankings: JobRanking[] }>>;
  /** Mark one or more jobs "not interested" — hides them from the feed. Returns how many were newly dismissed. */
  notInterested(jobIds: string[]): Promise<Result<{ dismissed: number }>>;
}

/** A stored per-job tailored resume (co_tailored_cvs). `resumeJson` is the
 *  PremiumResumeData shape emitted by the `pdf` mode; the client renders it. */
export interface TailoredCv {
  jobId: string;
  resumeJson: unknown;
  lang: string | null;
  paper: "a4" | "letter" | null;
  keywordCoverage: number | null;
  pdfPath: string | null;
  updatedAt: string;
}

// ── Settings domain (app-local, non-secret) ──────────────────────────────────

export type LlmProvider = "ollama";
export type ScanSource =
  | "naukri"
  | "hirist"
  | "instahyre"
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "lever";

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
  /** Search result pages to scrape per scan (20 jobs/page). */
  maxPages: number;
  /** Posting freshness filter in days. */
  jobAge: number;
  /** Minimum match band to show in the feed. */
  minMatch: MatchFloor;
}
/** How boldly the resume tailor reframes real experience. The profile is always the
 *  ceiling — higher intensity surfaces more real-but-unlisted skills, never invents. */
export type TailoringIntensity = "conservative" | "balanced" | "aggressive";
export interface TailoringSettings {
  intensity: TailoringIntensity;
}
export interface AppSettings {
  llm: LlmSettings;
  scan: ScanSettings;
  tailoring: TailoringSettings;
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
  /** Instahyre job_function codes that drive the Instahyre portal adapter's facet. */
  instahyreJobFunctions: number[];
  headline: string | null;
  bio: string | null;
  // Identity & contact
  fullName: string | null;
  username: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  portfolioUrl: string | null;
}

/** Profile fields the Job-preferences UI may write (subset of PUT /profile). */
export interface ProfilePatch {
  targetRoles?: string[];
  employmentType?: string;
  expectedCtc?: number;
  preferredLocations?: string[];
  openToRemote?: boolean;
  openToRelocate?: boolean;
  instahyreJobFunctions?: number[];
  headline?: string;
  bio?: string;
  // Identity & contact
  fullName?: string;
  username?: string;
  location?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolioUrl?: string;
  totalExperienceYears?: number;
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
  level: string | null;
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
  level?: string | null;
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
export interface CvUpload {
  id: string;
  s3Key: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface CvApi {
  /** Upload raw CV file bytes to S3. Returns upload metadata. */
  uploadFile(fileName: string, bytes: Uint8Array): Promise<Result<CvUpload>>;
  /** List all uploaded source files for this user (newest first). */
  listUploads(): Promise<Result<CvUpload[]>>;
  /** Delete an upload record by id. */
  deleteUpload(id: string): Promise<Result<void>>;
}

/** Result of a successful CLI configure. */
export interface CliConfigured {
  tokenPrefix: string;
  apiUrl: string;
  configPath: string;
}
/** State of the local ~/.reinit config. */
export interface CliStatus {
  configured: boolean;
  apiUrl: string;
  tokenPrefix?: string;
  configPath: string;
}
/** Which agent CLIs / tools are installed on this machine (PATH probe). */
export interface CliDetection {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  opencode: boolean;
  qwen: boolean;
  copilot: boolean;
  node: boolean;
  npx: boolean;
  ollama: boolean;
}
/** Result of the one-click `npx @reinit-ai/cli install` run. */
export interface CliInstallResult {
  output: string;
}

/**
 * REINIT CLI domain — one-click setup for the `/reinit` skill. Mints a long-lived
 * API token and writes ~/.reinit/config so the skill works with no manual paste.
 */
export interface CliApi {
  /** Auto: mint a token for the logged-in user + write the config. */
  configure(): Promise<Result<CliConfigured>>;
  /** Manual: write a token the user pasted. */
  configureWithToken(token: string): Promise<Result<CliConfigured>>;
  /** Read the current ~/.reinit config state. */
  status(): Promise<Result<CliStatus>>;
  /** Probe PATH for installed agent CLIs / tools. */
  detect(): Promise<Result<CliDetection>>;
  /** One-click: run `npx @reinit-ai/cli install` for non-Claude CLIs. */
  install(): Promise<Result<CliInstallResult>>;
  /** Background: globally install the REINIT CLI package (`npm i -g @reinit-ai/cli`). */
  installCli(): Promise<Result<CliInstallResult>>;
  /** Has the user granted the agent permanent permission to run unattended? */
  isAgentTrusted(): Promise<Result<{ trusted: boolean }>>;
  /** Grant permanent permission — future skill runs go fully unattended. */
  trustAgent(): Promise<Result<void>>;
  /** Two-way autonomy toggle — set or clear the unattended-run permission. */
  setAgentTrusted(trusted: boolean): Promise<Result<void>>;
}

/** A row in the evaluations list (lightweight). */
export interface EvaluationSummary {
  id: string;
  jobId: string | null;
  companyName: string | null;
  roleTitle: string | null;
  jobUrl: string | null;
  archetype: string | null;
  score: number | null;
  legitimacyTier: string | null;
  status: string;
  createdAt: string;
  /** Short JD blurb for the card (list) / full JD (detail). */
  jobDescription: string | null;
  /** From the linked pooled job (co_jobs) when job_id is set, else null. */
  logoUrl: string | null;
  location: string | null;
  // ── Report-derived analysis (parsed from the A–G report / machineSummary) ──
  /** Role Summary "Domain" — e.g. "Cloud DevOps / Platform engineering". */
  domain: string | null;
  /** Role Summary "Seniority" — e.g. "Mid-to-senior IC (5–9 yrs)". */
  seniority: string | null;
  /** Role Summary "Function" — e.g. "Build", "Operate". */
  jobFunction: string | null;
  /** Block D comp read — e.g. "12–20 LPA" (band the agent estimated). */
  comp: string | null;
  /** machineSummary final_decision / next_action — the report's verdict. */
  decision: string | null;
  /** machineSummary risk_level — posting/role risk. */
  riskLevel: string | null;
  /** machineSummary confidence — the agent's confidence in its read. */
  confidence: string | null;
}
/** Full evaluation incl. the report body (detail view). */
export interface EvaluationDetail extends EvaluationSummary {
  rawReport: string | null;
  machineSummary: unknown;
}

/**
 * Evaluations domain — reports pushed back by the skill (Atlas /evaluations).
 * The dashboard reads these to show pulled jobs + their A–H reports.
 */
export interface EvaluationsApi {
  list(): Promise<Result<{ evaluations: EvaluationSummary[] }>>;
  get(id: string): Promise<Result<{ evaluation: EvaluationDetail }>>;
  remove(id: string): Promise<Result<void>>;
}

/** Open locally-generated files (e.g. a tailored resume PDF) in the OS default app. */
export interface ArtifactApi {
  open(path: string): Promise<Result<Record<string, never>>>;
  /** Write a base64 PDF to the user's Downloads folder and open it. Returns the saved path.
   *  De-collides by suffixing (name (2).pdf, …) so repeated exports never overwrite. */
  saveAndOpenPdf(base64: string, filename: string): Promise<Result<{ path: string }>>;
}

export interface PdfApi {
  /** Render a full HTML document to a PDF via the system browser (Playwright). */
  render(html: string): Promise<Result<{ base64: string }>>;
}

export interface ApplyApi {
  /** Open a job's apply page in a real, logged-in browser window (assisted apply). */
  open(jobUrl: string): Promise<Result<{ opened: true }>>;
  /** Close the assisted-apply window. */
  close(): Promise<Result<{ closed: true }>>;
}

export interface CompassApi {
  version: string;
  auth: AuthApi;
  pdf: PdfApi;
  apply: ApplyApi;
  cli: CliApi;
  evaluations: EvaluationsApi;
  artifact: ArtifactApi;
  onboarding: OnboardingApi;
  suggest: SuggestApi;
  llm: LlmApi;
  document: DocumentApi;
  cv: CvApi;
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
