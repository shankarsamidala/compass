import { useProfilePrefs } from "@/features/settings/profile-api";
import { useSkills } from "@/features/profile/skills-api";
import { useEducation } from "@/features/profile/education-api";
import { useCertifications } from "@/features/profile/certifications-api";
import { useExperiences } from "@/features/profile/experience-api";
import { useProjects } from "@/features/profile/projects-api";
import { useLanguages } from "@/features/profile/languages-api";
import type {
  ExperienceItem,
  EducationItem,
  CertificationItem,
  ProjectItem,
  SkillItem,
} from "@compass/ipc-contract";
import type { ResumeData } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2021-03-01" → "Mar 2021"; null → "". */
function fmtIsoMonth(iso: string | null): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mon = m ? MONTHS[parseInt(m, 10) - 1] : null;
  return mon ? `${mon} ${y}` : y;
}

/** "Mar 2021 – Present" from a dated item. */
function dateRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const s = fmtIsoMonth(start);
  const e = isCurrent ? "Present" : fmtIsoMonth(end);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

/** "Jan 2018 – 2022" from year/month pairs (education). */
function eduRange(e: EducationItem): string {
  const fmt = (y: number | null, m: number | null) =>
    y ? (m ? `${MONTHS[m - 1]} ${y}` : String(y)) : "";
  const s = fmt(e.startYear, e.startMonth);
  const end = e.isCurrent ? "Present" : fmt(e.endYear, e.endMonth);
  return end || s;
}

function eduScore(e: EducationItem): string | undefined {
  if (e.cgpa != null) return `${e.cgpa} CGPA`;
  if (e.percentage != null) return `${e.percentage}%`;
  if (e.grade) return e.grade;
  return undefined;
}

/** Split a free-text description into resume bullet points. */
function toPoints(description: string | null): string[] {
  if (!description) return [];
  return description
    .split(/\r?\n|(?<=\.)\s*(?=[A-Z0-9])/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
}

function mapExperience(items: ExperienceItem[]): ResumeData["experience"] {
  return items.map((x) => ({
    role: x.title,
    company: x.company,
    location: x.location ?? "",
    period: dateRange(x.startDate, x.endDate, x.isCurrent),
    points: toPoints(x.description),
  }));
}

function mapEducation(items: EducationItem[]): ResumeData["education"] {
  return items.map((e) => ({
    degree: e.degree ?? e.level ?? e.institution,
    field: e.field ?? undefined,
    institution: e.institution,
    year: eduRange(e),
    score: eduScore(e),
  }));
}

function mapCertifications(items: CertificationItem[]): ResumeData["certifications"] {
  return items.map((c) => ({
    name: c.name,
    issuer: c.issuer ?? "",
    year: fmtIsoMonth(c.issueDate),
  }));
}

function mapProjects(items: ProjectItem[]): ResumeData["projects"] {
  return items.map((p) => ({
    name: p.title,
    tech: (p.techStack ?? []).join(" · "),
    description: p.description ?? "",
    github: p.repoUrl ?? undefined,
    live: p.url ?? undefined,
  }));
}

/** Group skills by their `section` into the resume's category rows. */
function mapSkills(items: SkillItem[]): ResumeData["skills"] {
  const groups = new Map<string, string[]>();
  for (const s of items) {
    const cat = s.section || "Skills";
    const arr = groups.get(cat) ?? [];
    arr.push(s.skill);
    groups.set(cat, arr);
  }
  return Array.from(groups, ([category, list]) => ({ category, items: list }));
}

export interface ResumeDataResult {
  resume: ResumeData;
  isLoading: boolean;
  isEmpty: boolean;
}

/** Compose the user's real profile data into the resume model. */
export function useResumeData(): ResumeDataResult {
  const { data: profile, isLoading: pLoading } = useProfilePrefs();
  const { data: skills = [], isLoading: sLoading } = useSkills();
  const { data: education = [], isLoading: eduLoading } = useEducation();
  const { data: certs = [], isLoading: cLoading } = useCertifications();
  const { data: experiences = [], isLoading: xLoading } = useExperiences();
  const { data: projects = [], isLoading: prjLoading } = useProjects();
  const { languages: langs } = useLanguages();

  const isLoading = pLoading || sLoading || eduLoading || cLoading || xLoading || prjLoading;

  const resume: ResumeData = {
    name: profile?.fullName?.trim() || "Your Name",
    title: profile?.headline?.trim() || "",
    phone: profile?.phone?.trim() || "",
    email: "",
    location: profile?.location?.trim() || "",
    linkedin: profile?.linkedin?.trim() || "",
    github: profile?.github?.trim() || undefined,
    summary: profile?.bio?.trim() || "",
    skills: mapSkills(skills),
    experience: mapExperience(experiences),
    projects: mapProjects(projects),
    education: mapEducation(education),
    certifications: mapCertifications(certs),
    languages: langs.map((l) => ({ name: l.name, level: l.level })),
  };

  const isEmpty =
    !isLoading &&
    resume.experience.length === 0 &&
    resume.education.length === 0 &&
    resume.projects.length === 0 &&
    resume.skills.length === 0 &&
    !resume.summary;

  return { resume, isLoading, isEmpty };
}
