/**
 * Shared JD HTML helpers for all portal adapters (Naukri `description`, Hirist
 * `introText`, Instahyre `description`). All three use the same shape: <b>/<strong>
 * section headings + <li> bullets. Produces clean text + structured sections so the
 * insights sheet can render headings/bullets instead of a flat blob.
 */
import type { JdSection } from "@compass/ipc-contract";

// Sentinel markers inserted before tags are stripped, so we can recover bullets
// and bold headings from the flattened text. Control chars never appear in JD text.
const BULLET = "";
const BOLD_OPEN = "";
const BOLD_CLOSE = "";

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&euro;": "", "&rsquo;": "'", "&lsquo;": "'",
  "&ldquo;": '"', "&rdquo;": '"', "&ndash;": "–", "&mdash;": "—",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    // Naukri mojibake: € + a trailing char stands in for mangled smart-quotes.
    .replace(/€[™˜œ]?/g, "'");
}

/** Flatten JD HTML to clean plain text (paragraphs + bullets, no tags). */
export function htmlToText(html?: string | null): string {
  if (!html) return "";
  return decode(
    String(html)
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Best-effort parse of JD HTML into { heading, items[] } sections. A bold run that
 * is (essentially) the whole line and short is treated as a heading; <li> and
 * paragraph lines become items under the current heading.
 */
export function parseJdSections(html?: string | null): JdSection[] {
  const src = String(html ?? "");
  if (!src.trim()) return [];

  let s = src
    .replace(/<\s*li[^>]*>/gi, `\n${BULLET}`)
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<\s*(b|strong|h[1-6])[^>]*>/gi, BOLD_OPEN)
    .replace(/<\/\s*(b|strong|h[1-6])\s*>/gi, BOLD_CLOSE)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  s = decode(s);

  const boldRe = new RegExp(`${BOLD_OPEN}([^${BOLD_CLOSE}]*)${BOLD_CLOSE}`);
  const markerRe = new RegExp(`[${BULLET}${BOLD_OPEN}${BOLD_CLOSE}]`, "g");

  const sections: JdSection[] = [];
  let cur: JdSection = { heading: null, items: [] };
  const flush = () => {
    if (cur.heading || cur.items.length) sections.push(cur);
  };

  for (const rawLine of s.split("\n")) {
    const bullet = rawLine.includes(BULLET);
    const boldMatch = rawLine.match(boldRe);
    const line = rawLine.replace(markerRe, "").replace(/\s+/g, " ").trim();
    if (!line) continue;

    const boldText = boldMatch ? boldMatch[1].replace(/\s+/g, " ").trim() : "";
    const isHeading =
      !bullet && boldText.length > 0 && boldText.length >= line.length - 2 && line.length <= 80;

    if (isHeading) {
      flush();
      cur = { heading: line.replace(/[:\s]+$/, "").trim(), items: [] };
    } else {
      cur.items.push(line);
    }
  }
  flush();
  return sections.filter((sec) => sec.items.length > 0 || sec.heading);
}
