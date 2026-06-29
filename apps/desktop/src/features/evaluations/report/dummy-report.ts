/**
 * Typed report model + a rich dummy instance (a real Datametica evaluation). The report
 * UI renders ONLY this shape — never markdown — so the design is decoupled from how data
 * is sourced. A later phase maps a real evaluation's raw_report (A–G markdown) into this
 * same `Report` type.
 */

export type Verdict = "strong" | "partial" | "gap";
export type Weight = "positive" | "concerning" | "neutral";
export type Recommendation = "Apply" | "Consider" | "Skip";

export interface Report {
  header: {
    company: string;
    role: string;
    logoUrl: string | null;
    location: string;
    score: number; // 0–5
    recommendation: Recommendation;
    legitimacy: string; // e.g. "High Confidence" | "Proceed with Caution"
    postedAt: string; // ISO
    applyUrl: string | null;
    experience?: string;
    openings?: number;
  };
  /** Match dimensions for the breakdown bars (each score 1–10). */
  dimensions: { label: string; score: number; hex: string }[];
  roleSummary: {
    archetype: string;
    domain: string;
    function: string;
    seniority: string;
    workMode: string;
    teamSize: string;
    tldr: string;
  };
  cvMatch: { requirement: string; evidence: string; verdict: Verdict; note?: string }[];
  gaps: { title: string; severity: "hard" | "soft"; mitigation: string }[];
  hardBlockers: string; // one-liner, e.g. "No hard blockers — mandatory core fully covered."
  strategy: { levelFit: string; sell: string[]; note: string };
  comp: {
    currency: string; // "₹"
    unit: string; // "LPA"
    bandMin: number;
    bandMax: number;
    likelyMin: number;
    likelyMax: number;
    target: number;
    score: number; // 0–5 sub-score
    read: string;
    findings: { label: string; value: string }[];
  };
  customization: { section: string; change: string; why: string }[];
  linkedin: string[];
  interview: {
    caseStudy: string;
    stories: { requirement: string; title: string; result: string; reflection: string }[];
    redFlags: { q: string; a: string }[];
  };
  legitimacy: { tier: string; signals: { signal: string; finding: string; weight: Weight }[]; note: string };
  keywords: string[];
}

export const DUMMY_REPORT: Report = {
  header: {
    company: "Datametica",
    role: "GCP DevOps Lead / Sr. Engineer",
    logoUrl: null,
    location: "Hyderabad, Pune, Bengaluru",
    score: 4.1,
    recommendation: "Apply",
    legitimacy: "Proceed with Caution",
    postedAt: "2026-06-21T09:00:00.000Z",
    applyUrl: "https://www.naukri.com/job-listings-gcp-devops-lead-datametica-hyderabad-pune-bengaluru-5-to-10-years-200326019290",
    experience: "5–10 yrs",
  },
  // 7 career dimensions (derived/estimated from the A–G prose — the report has no
  // explicit per-dimension scores; one overall score only).
  dimensions: [
    { label: "CV Match", score: 8, hex: "#3B82F6" },
    { label: "Level Fit", score: 9, hex: "#10B981" },
    { label: "Compensation", score: 5, hex: "#8B5CF6" },
    { label: "Growth & Demand", score: 7, hex: "#F59E0B" },
    { label: "Domain Fit", score: 8, hex: "#EC4899" },
    { label: "Skill Coverage", score: 7, hex: "#06B6D4" },
    { label: "Legitimacy", score: 6, hex: "#EAB308" },
  ],
  roleSummary: {
    archetype: "Cloud / Platform DevOps (lead)",
    domain: "GCP cloud infrastructure, IaC, CI/CD",
    function: "Build + operate + lead (hands-on, not pure management)",
    seniority: "Lead / Sr. Engineer · 5–10 yrs",
    workMode: "Hybrid",
    teamSize: "Small squad (lead)",
    tldr: "Hands-on GCP DevOps lead owning infra provisioning, Terraform automation, and CI/CD at a data-warehouse-migration consultancy (Google / AWS / Azure / Snowflake partner).",
  },
  cvMatch: [
    { requirement: "5–10 yrs public cloud, GCP primary", evidence: "“Lead Cloud Engineer (AWS & GCP) — Kalpas, 2021–Present”; 5+ yrs DevOps across AWS/Azure/GCP", verdict: "strong" },
    { requirement: "Terraform infra automation", evidence: "Skills: Terraform; “Working knowledge in Terraform, Helm Charts…”", verdict: "strong" },
    { requirement: "CI/CD (Cloud Build, Jenkins, GitLab, Bitbucket)", evidence: "“Managing the CI/CD process and automating deployments”; GitLab pipelines; Jenkins builds", verdict: "strong" },
    { requirement: "Shell + Python scripting", evidence: "“Shell & Python scripts to automate manual tasks”", verdict: "strong" },
    { requirement: "GKE / Kubernetes", evidence: "“Kubernetes for container orchestration”; Ingress; AKS", verdict: "partial", note: "K8s solid; GKE-specific exposure to confirm" },
    { requirement: "GCP Networking — VPC, VPN, Interconnect, Firewall", evidence: "Not explicitly evidenced in CV", verdict: "gap" },
    { requirement: "GCP IAM, Org Policy, VPC Service Control, SCC", evidence: "Not explicitly evidenced", verdict: "gap" },
    { requirement: "Composer, BigQuery, Dataproc, Dataflow (secondary)", evidence: "Not evidenced; CV is infra/ops, not data-engineering", verdict: "gap" },
    { requirement: "Git source control", evidence: "“Overseeing Git repositories… GitFlow branching”", verdict: "strong" },
    { requirement: "Team-player / lead", evidence: "“Led a team of 4 members”; “trained new joiners”", verdict: "strong" },
  ],
  gaps: [
    {
      title: "GCP-native networking & security",
      severity: "soft",
      mitigation: "Listed under mandatory “Foundation components”, but you've run cloud networking/IAM on AWS + GCP at Kalpas. Translate the AWS work to GCP equivalents in the cover letter; a weekend on “Networking in Google Cloud” + VPC Service Controls docs closes the vocabulary gap.",
    },
    {
      title: "GCP data-platform components",
      severity: "soft",
      mitigation: "Secondary / good-to-have — not a blocker. Name any data-pipeline adjacency (Kafka, ELK, Sumo Logic) and express willingness to ramp. It's a migration shop; they expect to train on their stack.",
    },
    {
      title: "GCP DevOps certification",
      severity: "soft",
      mitigation: "Good-to-have. Flag the Google Professional Cloud DevOps Engineer cert as in-progress — it directly raises this profile's market value.",
    },
  ],
  hardBlockers: "No hard blockers — the mandatory core (GCP + Terraform + CI/CD + Shell/Python) is fully covered.",
  strategy: {
    levelFit: "Lead / Sr. Engineer (5–10 yrs) — aligned with your level. No down-level risk on experience.",
    sell: [
      "Lead with ownership: “I run CI/CD end-to-end and led a 4-engineer team that cut deployment times 70%.”",
      "Frame the microservices refactor (90% infra cost reduction) as architecture-level decision-making.",
      "Position multi-cloud (AWS + Azure + GCP) as a differentiator — they're a Google/AWS/Azure/Snowflake partner; breadth is an asset for migration work.",
    ],
    note: "Consultancy lead role, not FAANG. If the offer lands below market, negotiate a 6-month review tied to a GCP cert + a defined GCP-networking ownership scope. Accept only if base clears ~22–25 LPA given your 35 LPA target.",
  },
  comp: {
    currency: "₹",
    unit: "LPA",
    bandMin: 18,
    bandMax: 28,
    likelyMin: 22,
    likelyMax: 25,
    target: 35,
    score: 3,
    read: "Your ₹35 LPA target likely sits at or above the top of Datametica's probable band — treat comp as the main negotiation risk. Your multi-cloud breadth + the 70% / 90% metrics justify pushing for the upper band.",
    findings: [
      { label: "DevOps Lead, 5–10 yrs (India)", value: "₹18–30 LPA senior · Lead/Principal ₹30–50 LPA+" },
      { label: "GCP-skill premium", value: "+30–40% (adv K8s + multi-cloud + observability)" },
      { label: "GCP avg (India)", value: "~₹31 LPA" },
      { label: "Hyderabad band", value: "₹12–20 LPA (below Bengaluru)" },
      { label: "Datametica (est.)", value: "₹18–28 LPA — below your 35 target" },
      { label: "Demand", value: "Rising in 2026 (GCP adoption + Pro DevOps cert)" },
    ],
  },
  customization: [
    { section: "Summary", change: "Lead with GCP first; add “Terraform-driven IaC and CI/CD pipeline ownership”", why: "Mirror the JD's GCP-primary framing for ATS" },
    { section: "Skills", change: "Surface GCP, Terraform, GKE, IAM, Cloud Build, Jenkins, GitLab to the front", why: "These are the JD's mandatory keywords" },
    { section: "Experience (Kalpas)", change: "Pull a GCP-specific bullet to the top (GKE, IAM, networking)", why: "Recruiter skims the first 2 lines" },
    { section: "Metrics", change: "Keep the 70% deploy-time cut and 90% cost reduction in the top third", why: "Quantified, lead-level proof" },
    { section: "Cert line", change: "Add “Google Professional Cloud DevOps Engineer (in progress)”", why: "Answers the JD's good-to-have certifications" },
  ],
  linkedin: [
    "Headline → “GCP / Multi-Cloud DevOps Lead | Terraform · GKE · CI/CD”",
    "About → lead with GCP + Terraform",
    "Add GKE, IAM, Cloud Build to skills",
    "Feature the 70% / 90% metrics",
    "Follow Datametica + add a Google Cloud cert badge",
  ],
  interview: {
    caseStudy: "Lead with the microservices refactor (90% cost reduction) — it shows the architecture-level judgment a lead is hired for — then bridge to the 70% deploy-time automation story for CI/CD depth.",
    stories: [
      { requirement: "CI/CD ownership", title: "Deployment automation at Kalpas", result: "70% reduction in deployment times", reflection: "Automated gates beat heroics; add canary stages earlier." },
      { requirement: "IaC / Terraform", title: "Infra-as-code rollout", result: "Repeatable provisioning, fewer config errors", reflection: "Module reuse is the real win; standardize the state backend day one." },
      { requirement: "Architecture", title: "Monolith → microservices", result: "90% infra cost reduction, team autonomy up", reflection: "Decompose by ownership boundaries, not just tech seams." },
      { requirement: "Observability", title: "Sumo Logic centralized logging", result: "Proactive troubleshooting, lower MTTR", reflection: "Alert fatigue is real; tune thresholds to SLOs." },
      { requirement: "Cloud migration", title: "On-prem → cloud lift-and-shift", result: "Minimal-downtime cutover", reflection: "Wave-plan and validate per-env before cutover." },
      { requirement: "Security / IAM", title: "SSO integration", result: "Secure B2C access, simpler config", reflection: "Secrets management is the backbone — rotate + least-privilege." },
      { requirement: "Leadership", title: "Leading a 4-engineer squad", result: "Optimized delivery, mentored team", reflection: "Document the paved road so it scales past you." },
    ],
    redFlags: [
      { q: "Your GCP networking depth — VPC Service Controls, Org Policy?", a: "Be honest: strong on AWS networking/IAM + GCP ops; fast ramp on GCP-native governance; cert in progress." },
      { q: "This role is GCP-primary — how recent is your GCP?", a: "Point to the current Kalpas AWS & GCP lead role and Bazaarvoice platform work." },
      { q: "Comfortable in a hybrid 3-city consultancy with client-facing migration work?", a: "Yes; tie to migration + cross-functional delivery experience." },
    ],
  },
  legitimacy: {
    tier: "Proceed with Caution",
    note: "The technical specificity suggests a real, engineering-written JD. The one concern is posting age — verify the listing is still live and apply directly via Datametica careers before investing heavily. No ghost-job red flags in the content itself.",
    signals: [
      { signal: "Posting freshness", finding: "URL slug looks like an older ID; aggregated via Naukri — exact age unverified", weight: "concerning" },
      { signal: "Description quality", finding: "Highly specific — names exact GCP components, tooling & cert paths. Low boilerplate", weight: "positive" },
      { signal: "Requirements realism", finding: "Coherent: 5–10 yrs + GCP + Terraform + CI/CD is realistic", weight: "positive" },
      { signal: "Scope clarity", finding: "Clear day-one scope (deploy / configure / maintain GCP, CI/CD)", weight: "positive" },
      { signal: "Salary transparency", finding: "Not disclosed — common in the Indian market, weak signal", weight: "neutral" },
      { signal: "Company legitimacy", finding: "Known data-migration firm; Google / AWS / Microsoft / Snowflake partner", weight: "positive" },
      { signal: "Reposting", finding: "No scan-history available to check", weight: "neutral" },
    ],
  },
  keywords: [
    "GCP", "DevOps Lead", "Terraform", "CI/CD", "Cloud Build", "Jenkins", "GitLab",
    "GKE", "Kubernetes", "IAM", "VPC", "VPC Service Control", "Shell", "Python",
    "Composer", "BigQuery", "Dataproc", "IaC", "Secrets Manager", "Cloud Monitoring",
  ],
};
