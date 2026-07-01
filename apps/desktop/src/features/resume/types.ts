export interface ResumeData {
  name: string;
  title: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  github?: string;
  summary: string;
  skills: { category: string; items: string[] }[];
  experience: {
    role: string;
    company: string;
    location: string;
    period: string;
    points: string[];
  }[];
  projects: { name: string; tech: string; description: string; github?: string; live?: string }[];
  education: {
    degree: string;
    field?: string;
    institution: string;
    year: string;
    score?: string;
  }[];
  certifications: { name: string; issuer: string; year: string }[];
  languages: { name: string; level: string }[];
  competencyGrid?: { keyword: string; evidence: string }[];
}
