import { z } from "zod";
import type { OnboardingSubmit } from "@compass/ipc-contract";

/**
 * Onboarding form schema (REIN-314..322) — reshaped to the career-ops API, ported
 * from studio. Steps 1–3 (Profile / Targets / Experience) → PUT /profile. Steps
 * 4–7 are the record arrays (work history / education / projects / proof points),
 * each replaced wholesale on submit by the main-process orchestration.
 */
const phone = z
  .string()
  .refine((s) => s.replace(/\D/g, "").length === 10, "Enter a 10-digit phone number");

const lpa = z.string().refine(
  (v) => {
    if (v.trim() === "") return true;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= 1000;
  },
  { message: "Enter your CTC in lakhs (LPA), e.g. 12 or 4.5" },
);

// ── Record entry schemas (steps 4–7) ─────────────────────────────────────────
// Work history uses an always-open inline form, so blank drafts are allowed; a
// started-but-incomplete entry is flagged via the array refine below.
const experienceEntrySchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  employmentType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
  skills: z.array(z.string()),
  highlights: z.string(),
});

/** An experience row counts as "started" if any meaningful field is touched. */
const experienceStarted = (e: z.infer<typeof experienceEntrySchema>) =>
  Boolean(
    e.title.trim() || e.company.trim() || e.location.trim() || e.startDate ||
    e.endDate || e.skills.length || e.highlights.trim(),
  );

// Education & Projects also use the always-open inline form: blank drafts are
// allowed; started-but-incomplete rows are flagged by the array refine below.
const eduEntrySchema = z
  .object({
    level: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string(),
    institution: z.string(),
    startYear: z.string(),
    endYear: z.string(),
    isCurrent: z.boolean(),
    gradingSystem: z.string(),
    score: z.string(),
  })
  .superRefine((e, ctx) => {
    if (!e.score.trim()) return;
    const n = Number(e.score);
    if (e.gradingSystem === "cgpa" && (!Number.isFinite(n) || n < 0 || n > 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["score"], message: "CGPA must be between 0 and 10" });
    }
    if (e.gradingSystem === "percentage" && (!Number.isFinite(n) || n < 0 || n > 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["score"], message: "Percentage must be between 0 and 100" });
    }
  });

const educationStarted = (e: z.infer<typeof eduEntrySchema>) =>
  Boolean(
    e.level.trim() || e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim() ||
    e.startYear || e.endYear || e.score.trim(),
  );

const projectEntrySchema = z.object({
  title: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  url: z.string(),
});

const projectStarted = (p: z.infer<typeof projectEntrySchema>) =>
  Boolean(p.title.trim() || p.description.trim() || p.techStack.length || p.url.trim());

const proofPointEntrySchema = z.object({
  title: z.string(),
  metric: z.string(),
  url: z.string(),
});

const proofPointStarted = (p: z.infer<typeof proofPointEntrySchema>) =>
  Boolean(p.title.trim() || p.metric.trim() || p.url.trim());

export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type EduEntry = z.infer<typeof eduEntrySchema>;
export type ProjectEntry = z.infer<typeof projectEntrySchema>;
export type ProofPointEntry = z.infer<typeof proofPointEntrySchema>;

export const onboardingSchema = z.object({
  // Step 1 — profile
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  location: z.string().trim().min(1, "City or region is required"),
  phone,
  linkedin: z.string().trim().min(1, "LinkedIn username is required"),
  github: z.string().trim().min(1, "GitHub username is required"),
  portfolioUrl: z.string(),
  // Step 2 — targets
  selectedRoles: z.array(z.string()).min(1, "Select at least one role"),
  employmentType: z.string().min(1, "Pick an employment type"),
  openToRemote: z.boolean(),
  openToRelocation: z.boolean(),
  preferredLocations: z.array(z.string()),
  // Step 3 — experience & comp
  isFresher: z.boolean(),
  totalExperienceYears: z.string(),
  currentCompany: z.string(),
  currentDesignation: z.string(),
  currentCtc: lpa,
  expectedCtc: lpa,
  noticePeriod: z.string(),
  currentlyServingNotice: z.boolean(),
  highestQualification: z.string(),
  graduationYear: z.string(),
  // Steps 4–7 — record arrays (all skippable)
  experiences: z.array(experienceEntrySchema),
  eduEntries: z.array(eduEntrySchema),
  projects: z.array(projectEntrySchema),
  proofPoints: z.array(proofPointEntrySchema),
  // Extracted resume text (step 7) — not submitted; powers "import from resume".
  resumeText: z.string(),
}).superRefine((v, ctx) => {
  // Only flag rows the user actually started filling.
  v.experiences.forEach((e, i) => {
    if (!experienceStarted(e)) return;
    if (!e.title.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["experiences", i, "title"], message: "Role title is required" });
    if (!e.company.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["experiences", i, "company"], message: "Company is required" });
  });
  v.eduEntries.forEach((e, i) => {
    if (!educationStarted(e)) return;
    if (!e.level.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["eduEntries", i, "level"], message: "Select a level" });
    if (!e.institution.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["eduEntries", i, "institution"], message: "Institution is required" });
  });
  v.projects.forEach((p, i) => {
    if (!projectStarted(p)) return;
    if (!p.title.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["projects", i, "title"], message: "Project title is required" });
  });
  v.proofPoints.forEach((p, i) => {
    if (!proofPointStarted(p)) return;
    if (!p.title.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["proofPoints", i, "title"], message: "Add the achievement" });
  });
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

// ── Blank-entry factories (for "Add" buttons) ────────────────────────────────
export const blankExperience = (): ExperienceEntry => ({
  title: "", company: "", location: "", employmentType: "", startDate: "", endDate: "",
  isCurrent: false, skills: [], highlights: "",
});
export const blankEducation = (): EduEntry => ({
  level: "", degree: "", fieldOfStudy: "", institution: "", startYear: "", endYear: "",
  isCurrent: false, gradingSystem: "", score: "",
});
export const blankProject = (): ProjectEntry => ({ title: "", description: "", techStack: [], url: "" });
export const blankProofPoint = (): ProofPointEntry => ({ title: "", metric: "", url: "" });

export const DEFAULT_VALUES: OnboardingValues = {
  firstName: "",
  lastName: "",
  location: "",
  phone: "",
  linkedin: "",
  github: "",
  portfolioUrl: "",
  selectedRoles: [],
  employmentType: "",
  openToRemote: false,
  openToRelocation: true,
  preferredLocations: [],
  isFresher: false,
  totalExperienceYears: "",
  currentCompany: "",
  currentDesignation: "",
  currentCtc: "",
  expectedCtc: "",
  noticePeriod: "",
  currentlyServingNotice: false,
  highestQualification: "",
  graduationYear: "",
  experiences: [],
  eduEntries: [],
  projects: [],
  proofPoints: [],
  resumeText: "",
};

export const STEP_FIELDS = {
  1: ["firstName", "lastName", "location", "phone", "linkedin", "github", "portfolioUrl"],
  2: ["selectedRoles", "employmentType", "openToRemote", "openToRelocation", "preferredLocations"],
  3: [
    "isFresher",
    "totalExperienceYears",
    "currentCompany",
    "currentDesignation",
    "currentCtc",
    "expectedCtc",
    "noticePeriod",
    "currentlyServingNotice",
    "highestQualification",
    "graduationYear",
  ],
  4: ["experiences"],
  5: ["eduEntries"],
  6: ["projects"],
  7: [], // resume — UI only, nothing to validate
  8: ["proofPoints"],
} as const satisfies Record<number, readonly (keyof OnboardingValues)[]>;

// ── Options ──────────────────────────────────────────────────────────────────
export const EMPLOYMENT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "c2h", label: "Contract-to-hire" },
];
export const HIGHEST_QUALIFICATIONS = ["10th", "12th / Intermediate", "Diploma", "Bachelor's", "Master's", "PhD"];
export const EDUCATION_LEVELS = ["10th", "12th / Intermediate", "Diploma", "Bachelor's", "Master's", "PhD"];
export const GRADING_SYSTEMS = [
  { value: "cgpa", label: "CGPA" },
  { value: "percentage", label: "Percentage" },
  { value: "none", label: "Not applicable" },
];
export const ROLE_OPTIONS = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer",
  "DevOps Engineer", "Cloud Engineer", "Data Engineer", "Data Scientist", "ML Engineer",
  "QA Engineer", "Security Engineer", "Engineering Manager",
];
export const ALL_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "Go", "SQL", "PostgreSQL",
  "MongoDB", "Docker", "Kubernetes", "AWS", "Git", "REST APIs", "Next.js", "GraphQL", "Redis",
  "Linux", "CI/CD", "Vue.js", "Angular", "Svelte", "Express.js", "FastAPI", "Django", "Spring Boot",
  "Rust", "C++", "C#", ".NET", "PHP", "Ruby", "Swift", "Kotlin", "Flutter", "React Native",
  "Tailwind CSS", "Jest", "Cypress", "Playwright", "MySQL", "Elasticsearch", "Kafka", "Azure", "GCP",
  "Terraform", "Machine Learning", "TensorFlow", "PyTorch", "System Design", "Microservices",
];

// ── Form → API payload (mirrors studio submitOnboarding) ─────────────────────
const normalizeUrl = (u: string) => {
  const s = u.trim();
  if (!s) return undefined;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/** Month input gives YYYY-MM; the API stores ISO dates → pad to the 1st. */
const monthToDate = (s: string) => {
  const v = s.trim();
  if (!v) return undefined;
  return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v;
};

/** Education level display label → career-ops enum code. */
const EDU_LEVEL_CODES: Record<string, string> = {
  "10th": "ssc_x",
  "12th / Intermediate": "twelfth",
  Diploma: "bachelor_diploma",
  "Bachelor's": "bachelor_diploma",
  "Master's": "masters",
  PhD: "phd",
};
const eduLevelCode = (label: string) => EDU_LEVEL_CODES[label.trim()] ?? undefined;

export function toSubmit(v: OnboardingValues): OnboardingSubmit {
  const str = (s: string) => (s.trim() ? s.trim() : undefined);
  const num = (s: string) => (s.trim() ? Number(s) : undefined);
  const int = (s: string) => (s.trim() ? parseInt(s, 10) : undefined);
  const arr = (a: string[]) => (a.length ? a : undefined);

  const phoneDigits = v.phone.replace(/\D/g, "");
  const liUser = v.linkedin.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/+$/, "");
  const ghUser = v.github.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "");

  return {
    profile: {
      fullName: [v.firstName.trim(), v.lastName.trim()].filter(Boolean).join(" ") || undefined,
      location: str(v.location),
      phone: phoneDigits ? `+91${phoneDigits}` : undefined,
      linkedin: liUser ? `https://linkedin.com/in/${liUser}` : undefined,
      github: ghUser ? `https://github.com/${ghUser}` : undefined,
      portfolioUrl: str(v.portfolioUrl),
      targetRoles: arr(v.selectedRoles),
      employmentType: str(v.employmentType),
      openToRemote: v.openToRemote,
      openToRelocate: v.openToRelocation,
      preferredLocations: v.openToRelocation ? arr(v.preferredLocations) : undefined,
      totalExperienceYears: v.isFresher ? 0 : num(v.totalExperienceYears),
      currentCompany: v.isFresher ? undefined : str(v.currentCompany),
      currentDesignation: v.isFresher ? undefined : str(v.currentDesignation),
      currentCtc: v.isFresher ? undefined : num(v.currentCtc),
      expectedCtc: num(v.expectedCtc),
      noticePeriod: v.isFresher ? undefined : int(v.noticePeriod),
      currentlyServingNotice: v.currentlyServingNotice,
      highestQualification: str(v.highestQualification),
      graduationYear: int(v.graduationYear),
    },
    experiences: (v.isFresher ? [] : v.experiences)
      .filter((e) => e.company.trim() && e.title.trim())
      .map((e) => ({
        company: e.company.trim(),
        title: e.title.trim(),
        location: str(e.location),
        employmentType: str(e.employmentType),
        startDate: monthToDate(e.startDate),
        endDate: e.isCurrent ? undefined : monthToDate(e.endDate),
        isCurrent: e.isCurrent,
        skills: arr(e.skills),
        bullets: e.highlights.trim()
          ? e.highlights.split("\n").map((b) => b.trim()).filter(Boolean)
          : undefined,
      })),
    education: v.eduEntries
      .filter((e) => e.institution.trim())
      .map((e) => ({
        institution: e.institution.trim(),
        level: eduLevelCode(e.level),
        degree: str(e.degree),
        field: str(e.fieldOfStudy),
        startYear: int(e.startYear),
        endYear: e.isCurrent ? undefined : int(e.endYear),
        isCurrent: e.isCurrent,
        cgpa: e.gradingSystem === "cgpa" ? num(e.score) : undefined,
        percentage: e.gradingSystem === "percentage" ? num(e.score) : undefined,
      })),
    projects: v.projects
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: str(p.description),
        techStack: arr(p.techStack),
        url: normalizeUrl(p.url),
      })),
    proofPoints: v.proofPoints
      .filter((pp) => pp.title.trim())
      .map((pp) => ({
        title: pp.title.trim(),
        metrics: str(pp.metric),
        url: normalizeUrl(pp.url),
      })),
  };
}
