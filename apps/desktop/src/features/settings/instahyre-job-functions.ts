/**
 * Instahyre `job_function` catalogue (their /api/v1/job_function list, 58 entries).
 * The user picks from these in Job Preferences; the codes persist to the profile
 * (`instahyreJobFunctions`) and drive the Instahyre portal adapter's `job_functions=`
 * facet (user-side scrape). Grouped by Instahyre's own job_category, tech first.
 */
export interface JobFunction {
  id: number;
  name: string;
}

export interface JobFunctionGroup {
  category: string;
  tech: boolean;
  functions: JobFunction[];
}

export const INSTAHYRE_JOB_FUNCTION_GROUPS: JobFunctionGroup[] = [
  {
    category: "Software Engineering",
    tech: true,
    functions: [
      { id: 1, name: "Full-Stack Development" },
      { id: 10, name: "Backend Development" },
      { id: 3, name: "Frontend Development" },
      { id: 60, name: "Mobile Development" },
      { id: 5, name: "QA / SDET" },
      { id: 17, name: "Big Data / DWH / ETL" },
      { id: 44, name: "Embedded / Kernel Development" },
      { id: 12, name: "Engineering Management" },
      { id: 76, name: "Other Software Development" },
    ],
  },
  {
    category: "Data Science and Analysis",
    tech: true,
    functions: [
      { id: 9, name: "Data Science / Machine Learning" },
      { id: 39, name: "Data Analysis / Business Intelligence" },
    ],
  },
  {
    category: "IT Operations and Support",
    tech: true,
    functions: [
      { id: 8, name: "DevOps / Cloud" },
      { id: 58, name: "Solution Architecture" },
      { id: 37, name: "IT Security" },
      { id: 30, name: "Database Admin / Development" },
      { id: 35, name: "Network Administration" },
      { id: 36, name: "Systems Administration" },
      { id: 57, name: "IT Management / IT Support" },
      { id: 75, name: "Technical / Production Support" },
      { id: 63, name: "Technical Writing" },
    ],
  },
  {
    category: "Product / Project Management",
    tech: true,
    functions: [
      { id: 11, name: "Product Management" },
      { id: 4, name: "Project Management" },
    ],
  },
  {
    category: "Design and Creative",
    tech: true,
    functions: [
      { id: 7, name: "UX / Visual Design" },
      { id: 18, name: "Graphic Design / Animation" },
      { id: 83, name: "Architecture / Interior Design" },
      { id: 84, name: "Fashion Design" },
      { id: 62, name: "Photography / Videography" },
      { id: 77, name: "Other Design" },
    ],
  },
  {
    category: "Consulting",
    tech: true,
    functions: [
      { id: 81, name: "Management Consulting" },
      { id: 78, name: "Functional Consulting" },
      { id: 80, name: "Technical Consulting" },
    ],
  },
  {
    category: "Hardware Engineering",
    tech: true,
    functions: [
      { id: 93, name: "ASIC / FPGA Engineering" },
      { id: 92, name: "Hardware Design and Research" },
      { id: 94, name: "PCB / Board Engineering" },
      { id: 95, name: "Hardware Test & Validation" },
      { id: 96, name: "Other Hardware" },
    ],
  },
  {
    category: "Product, Sales & Business",
    tech: false,
    functions: [
      { id: 34, name: "General Management / Strategy" },
      { id: 25, name: "Sales / Business Development" },
      { id: 79, name: "Presales" },
      { id: 82, name: "Sales Support & Operations" },
    ],
  },
  {
    category: "Marketing",
    tech: false,
    functions: [
      { id: 22, name: "Online Marketing" },
      { id: 42, name: "SEO / SEM" },
      { id: 20, name: "Brand Management" },
      { id: 85, name: "Advertising / Creative" },
      { id: 31, name: "Content Writing" },
      { id: 43, name: "PR / Communications" },
      { id: 86, name: "Market Research" },
      { id: 61, name: "Event Management" },
    ],
  },
  {
    category: "Operations & Customer Service",
    tech: false,
    functions: [
      { id: 28, name: "Operations Management" },
      { id: 24, name: "Customer Service" },
      { id: 87, name: "Data Entry / MIS" },
    ],
  },
  {
    category: "Human Resources",
    tech: false,
    functions: [
      { id: 32, name: "HR Generalist" },
      { id: 33, name: "Talent Acquisition" },
    ],
  },
  {
    category: "Accounting and Finance",
    tech: false,
    functions: [
      { id: 90, name: "Finance" },
      { id: 40, name: "Accounting & Taxation" },
      { id: 91, name: "Audit & Control" },
      { id: 89, name: "Company Secretary & Compliance" },
      { id: 88, name: "Payroll & Transactions" },
    ],
  },
];

/** Flat id → label lookup for rendering selected chips / summaries. */
export const INSTAHYRE_JOB_FUNCTION_LABELS: Record<number, string> =
  Object.fromEntries(
    INSTAHYRE_JOB_FUNCTION_GROUPS.flatMap((g) =>
      g.functions.map((f) => [f.id, f.name] as const),
    ),
  );
