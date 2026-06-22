// Minimal Job shape used by the ported dashoard insights sheet.
export interface MatchBreakdown {
  overall_pct: number;
  skills_pct: number;
  experience_pct: number;
  seniority_pct: number;
  location_pct: number;
}

export interface Job {
  id: string;
  title: string;
  company_name: string;
  logo_url?: string | null;
  location_cities?: string[];
  source?: string | null;
  source_url?: string | null;
  score?: number | null;
  match_breakdown?: MatchBreakdown | null;
  skills_matched?: string[];
  skills_missing?: string[];
  work_mode?: string | null;
  exp_min?: number | null;
  exp_max?: number | null;
  seniority_level?: string | null;
  key_skills?: string[];
  tech_stack?: string[];
  preferred_skills?: string[];
  responsibilities?: string[];
  requirements?: string[];
  description_summary?: string | null;
  salary_disclosed?: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  applicants?: string | number | null;
  openings?: number | null;
  posted_raw?: string | null;
}
