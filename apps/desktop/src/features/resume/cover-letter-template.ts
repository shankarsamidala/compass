// Cover-letter → A4 HTML for the PDF pipeline (api.pdf.render). Matches the resume
// template's typography (Inter, white A4, brand accent rule) so the two documents look
// like a set. The agent returns the finished letter as plain text; we only typeset it.

const BRAND = "#E86235";
const TEXT = "#1A1A1A";
const BORDER = "#E8E6E0";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text letter → paragraphs. Blank line = paragraph break; single newline = <br>. */
function toParagraphs(letter: string): string {
  return letter
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function buildCoverLetterHTML(
  letter: string,
  opts: { name?: string; company?: string } = {},
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 12.5px; line-height: 1.7; color: ${TEXT}; }
  .page { padding: 0 52px; background: #fff; }
  .header { padding-top: 24px; margin-bottom: 20px; }
  .name { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
  .meta { font-size: 11px; color: #6A6A66; margin-top: 4px; }
  .divider { border: none; border-top: 2px solid ${BRAND}; margin: 12px 0 22px; }
  .body p { margin-bottom: 14px; }
  .body p:last-child { margin-bottom: 0; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid ${BORDER}; font-size: 10.5px; color: #9A9A96; }
</style>
</head>
<body>
<div class="page">
  ${
    opts.name
      ? `<div class="header"><div class="name">${esc(opts.name)}</div>${
          opts.company ? `<div class="meta">Cover letter — ${esc(opts.company)}</div>` : ""
        }</div><hr class="divider">`
      : ""
  }
  <div class="body">${toParagraphs(letter)}</div>
</div>
</body>
</html>`;
}
