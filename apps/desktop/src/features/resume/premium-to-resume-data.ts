import type { ResumeData } from "./types";

/**
 * Normalize a stored tailored-CV `resumeJson` (the PremiumResumeData shape emitted
 * by the reinit `pdf` mode, persisted in co_tailored_cvs) into the app's `ResumeData`
 * so it renders through the exact same template/PDF pipeline as the base resume.
 *
 * The two shapes already line up field-for-field; this only guards against missing
 * or malformed fields since `resumeJson` arrives as `unknown` from the server.
 */

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOpt = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Coerce a value to a string[] — accepts an array or a comma/newline-delimited string. */
function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (typeof v === "string") return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function premiumToResumeData(resumeJson: unknown): ResumeData {
  const r = obj(resumeJson);

  return {
    name: str(r.name),
    title: str(r.title),
    phone: str(r.phone),
    email: str(r.email),
    location: str(r.location),
    linkedin: str(r.linkedin),
    github: strOpt(r.github),
    summary: str(r.summary),
    skills: arr(r.skills).map((s) => {
      const g = obj(s);
      return { category: str(g.category), items: toStrArray(g.items) };
    }),
    experience: arr(r.experience).map((e) => {
      const x = obj(e);
      return {
        role: str(x.role),
        company: str(x.company),
        location: str(x.location),
        period: str(x.period),
        points: toStrArray(x.points),
      };
    }),
    projects: arr(r.projects).map((p) => {
      const x = obj(p);
      return {
        name: str(x.name),
        tech: str(x.tech),
        description: str(x.description),
        github: strOpt(x.github),
        live: strOpt(x.live),
      };
    }),
    education: arr(r.education).map((e) => {
      const x = obj(e);
      return {
        degree: str(x.degree),
        field: strOpt(x.field),
        institution: str(x.institution),
        year: str(x.year),
        score: strOpt(x.score),
      };
    }),
    certifications: arr(r.certifications).map((c) => {
      const x = obj(c);
      return { name: str(x.name), issuer: str(x.issuer), year: str(x.year) };
    }),
    languages: arr(r.languages).map((l) => {
      const x = obj(l);
      return { name: str(x.name), level: str(x.level) };
    }),
    competencyGrid: arr(r.competencyGrid).map((c) => {
      const x = obj(c);
      return { keyword: str(x.keyword), evidence: str(x.evidence) };
    }),
  };
}
