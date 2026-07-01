import type { ResumeData } from "./types";

// ── Colors ───────────────────────────────────────────────────────────────────
// The resume renders inside an iframe (its own document), so app-level CSS
// variables don't reach it — these are concrete hex values. The document stays
// a white A4 page (correct for print/ATS) with the Compass brand as the accent.
const BRAND = "#E86235"; // Compass --brand
const TEXT = "#1A1A1A";
const MUTED = "#6A6A66";
const BORDER = "#E8E6E0";

// ── HTML helpers ────────────────────────────────────────────────────────────

/** Strips HTML tags and converts to plain text. */
function strip(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Escapes user-supplied strings before embedding in HTML to prevent XSS. */
function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips HTML tags for preview, keeps rich HTML for PDF. */
function clean(value: string | null | undefined, mode: "preview" | "pdf"): string {
  if (!value) return "";
  if (mode === "pdf") return value;
  return esc(strip(value));
}

// ── HTML Builder ────────────────────────────────────────────────────────────

export function buildResumeHTML(
  resume: ResumeData,
  mode: "preview" | "pdf" = "preview",
): string {
  const skills = resume.skills
    .map(
      (g) =>
        `<div class="skill-row"><span class="skill-cat">${esc(g.category)}:</span> ${g.items.map(esc).join(", ")}</div>`,
    )
    .join("");

  const experience = resume.experience
    .map(
      (exp) => `
      <div class="exp-entry">
        <div class="exp-header">
          <div>
            <div class="exp-role">${esc(exp.role)}</div>
            <div class="exp-company">${esc(exp.company)} · ${esc(exp.location)}</div>
          </div>
          <div class="exp-period">${esc(exp.period)}</div>
        </div>
        <ul class="exp-bullets">${exp.points.map((p) => `<li>${clean(p, mode)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");

  const projects = resume.projects
    .map((proj) => {
      // URLs are validated to only allow http/https to prevent javascript: URIs
      const safeUrl = (url: string | undefined) => (url?.match(/^https?:\/\//) ? url : "#");
      const links = [
        proj.github ? `<a href="${safeUrl(proj.github)}" class="proj-link">Source</a>` : "",
        proj.github && proj.live ? " · " : "",
        proj.live ? `<a href="${safeUrl(proj.live)}" class="proj-link">Live</a>` : "",
      ].join("");
      return `
      <div class="proj-entry">
        <div class="proj-header">
          <span class="proj-name">${esc(proj.name)}</span>
          <span>${links}</span>
        </div>
        <div class="proj-desc">${clean(proj.description, mode)}</div>
        <div class="proj-tech">${esc(proj.tech)}</div>
      </div>`;
    })
    .join("");

  const education = resume.education
    .map(
      (edu) => `
      <div class="edu-entry">
        <div class="edu-header">
          <div>
            <div class="edu-degree">${esc(edu.degree)}</div>
            ${edu.field ? `<div class="edu-detail">${esc(edu.field)}</div>` : ""}
            <div class="edu-detail">${esc(edu.institution)}${edu.score ? ` · ${esc(edu.score)}` : ""}</div>
          </div>
          <div class="edu-year">${esc(edu.year)}</div>
        </div>
      </div>`,
    )
    .join("");

  const certifications = resume.certifications
    .map(
      (cert) => `
      <div class="cert-entry">
        <div><span class="cert-name">${esc(cert.name)}</span> <span class="cert-issuer">- ${esc(cert.issuer)}</span></div>
        <span class="cert-year">${esc(cert.year)}</span>
      </div>`,
    )
    .join("");

  const languages = resume.languages
    .map(
      (l) =>
        `<span><span class="lang-name">${esc(l.name)}</span> <span class="lang-level">(${esc(l.level)})</span></span>`,
    )
    .join("");

  const competencyGrid = (resume.competencyGrid ?? [])
    .map(
      (c) =>
        `<div class="skill-row"><span class="skill-cat">${esc(c.keyword)}:</span> ${esc(c.evidence)}</div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 12.5px; line-height: 1.55; color: ${TEXT}; }

  .page { width: ${mode === "preview" ? "794px" : "100%"}; min-height: ${mode === "preview" ? "1123px" : "0"}; padding: ${mode === "preview" ? "24px" : "0"} 52px 24px; background: #fff; ${mode === "preview" ? `border-top: 8px solid ${BRAND};` : ""} }
  .header { text-align: center; margin-bottom: 10px; }
  .name { font-size: 40px; font-weight: 700; letter-spacing: -0.5px; }
  .headline { font-size: 16px; font-weight: 500; color: ${BRAND}; margin-top: -5px; margin-bottom: 6px; }
  .contacts { font-size: 10.5px; color: ${MUTED}; display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
  .sep { color: ${BORDER}; }
  .divider { border: none; border-top: 2px solid ${BRAND}; margin: 0 0 18px; }

  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${BRAND}; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid ${BORDER}; }
  .summary { font-size: 12.5px; color: #2E2E2C; }

  .skill-row { margin-bottom: 4px; font-size: 12px; }
  .skill-cat { font-weight: 600; }

  .exp-entry { margin-bottom: 14px; }
  /* Keep the role header with its first bullets; allow long entries to flow across pages. */
  .exp-header { break-after: avoid; page-break-after: avoid; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .exp-role { font-weight: 700; font-size: 15px; }
  .exp-company { font-size: 12px; color: ${MUTED}; }
  .exp-period { font-size: 12px; font-weight: 500; white-space: nowrap; }
  .exp-bullets { margin-top: 8px; padding-left: 16px; list-style-type: disc; color: #000; }
  .exp-bullets li { margin-bottom: 2px; font-size: 12px; }

  .proj-entry { margin-bottom: 10px; page-break-inside: avoid; }
  .proj-header { display: flex; justify-content: space-between; align-items: center; }
  .proj-name { font-weight: 700; font-size: 13px; }
  .proj-link { font-size: 11px; color: ${BRAND}; text-decoration: none; }
  .proj-desc { font-size: 12px; color: #2E2E2C; margin-top: 4px; }
  .proj-tech { font-size: 11.5px; color: ${MUTED}; margin-top: 6px; }

  .edu-entry { margin-bottom: 10px; page-break-inside: avoid; }
  .edu-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .edu-degree { font-weight: 700; font-size: 13px; }
  .edu-detail { font-size: 11.5px; color: ${MUTED}; }
  .edu-year { font-size: 12px; color: ${MUTED}; }

  .cert-entry { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .cert-name { font-weight: 600; font-size: 12px; }
  .cert-issuer { font-size: 11.5px; color: ${MUTED}; }
  .cert-year { font-size: 11.5px; color: ${MUTED}; }

  .lang-row { display: flex; gap: 24px; font-size: 12px; }
  .lang-name { font-weight: 600; }
  .lang-level { color: ${MUTED}; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${esc(resume.name)}</div>
    <div class="headline">${esc(resume.title)}</div>
    <div class="contacts">
      <span>${esc(resume.phone)}</span><span class="sep">|</span>
      <span>${esc(resume.email)}</span><span class="sep">|</span>
      <span>${esc(resume.location)}</span><span class="sep">|</span>
      <span>${esc(resume.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</span>
    </div>
  </div>
  <hr class="divider">
  ${resume.summary ? `<div class="section"><div class="section-title">Professional Summary</div><div class="summary">${clean(resume.summary, mode)}</div></div>` : ""}
  ${resume.skills.length > 0 ? `<div class="section"><div class="section-title">Technical Skills</div>${skills}</div>` : ""}
  ${(resume.competencyGrid ?? []).length > 0 ? `<div class="section"><div class="section-title">Key Competencies</div>${competencyGrid}</div>` : ""}
  ${resume.experience.length > 0 ? `<div class="section"><div class="section-title">Work Experience</div>${experience}</div>` : ""}
  ${resume.projects.length > 0 ? `<div class="section"><div class="section-title">Projects</div>${projects}</div>` : ""}
  ${resume.education.length > 0 ? `<div class="section"><div class="section-title">Education</div>${education}</div>` : ""}
  ${resume.certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div>${certifications}</div>` : ""}
  ${resume.languages.length > 0 ? `<div class="section"><div class="section-title">Languages</div><div class="lang-row">${languages}</div></div>` : ""}
</div>
</body>
</html>`;
}

// ── Preview Component ───────────────────────────────────────────────────────

export function ResumePreview({ resume }: { resume: ResumeData }) {
  const html = buildResumeHTML(resume);

  return (
    <div className="flex justify-center px-4 py-6 sm:px-0 sm:py-8">
      {/*
       * The resume is rendered at a fixed 794px (A4 width). On screens
       * narrower than that we scale it down via CSS transform so it fits
       * without horizontal scroll. The wrapper's height is adjusted to
       * match the scaled iframe via a padding-bottom trick.
       */}
      <div className="w-full sm:w-auto" style={{ maxWidth: "794px" }}>
        <div className="origin-top sm:[transform:none]">
          <iframe
            srcDoc={html}
            title="Resume Preview"
            scrolling="no"
            className="w-[794px] border-none bg-white"
            style={{ height: "1123px", overflow: "hidden", transformOrigin: "top left" }}
            onLoad={(e) => {
              const frame = e.currentTarget;
              const doc = frame.contentDocument;
              if (!doc) return;

              // Re-measure on every reflow. Fonts (Inter) load async and push the
              // content taller after onLoad — measuring once clips the bottom.
              const fit = () => {
                const body = doc.body;
                if (!body) return;
                const height = Math.max(
                  body.scrollHeight,
                  doc.documentElement?.scrollHeight ?? 0,
                );
                const container = frame.parentElement;
                const containerWidth = container?.clientWidth ?? 794;
                if (containerWidth < 794) {
                  const scale = containerWidth / 794;
                  frame.style.height = `${height}px`;
                  frame.style.transform = `scale(${scale})`;
                  frame.style.transformOrigin = "top left";
                  if (container) container.style.height = `${height * scale}px`;
                } else {
                  frame.style.transform = "none";
                  frame.style.height = `${height}px`;
                  if (container) container.style.height = "auto";
                }
              };

              fit();
              // Re-fit after web fonts settle and on any later size change.
              doc.fonts?.ready.then(fit).catch(() => {});
              if (typeof ResizeObserver !== "undefined" && doc.body) {
                new ResizeObserver(fit).observe(doc.body);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
