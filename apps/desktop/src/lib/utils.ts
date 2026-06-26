import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SOURCE_BASE: Record<string, string> = {
  naukri: "https://www.naukri.com",
  instahyre: "https://www.instahyre.com",
  linkedin: "https://www.linkedin.com",
};

/** Converts a relative job URL to absolute using the source portal's base domain. */
export function toAbsoluteJobUrl(url: string | null | undefined, source?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/") && source) {
    const base = SOURCE_BASE[source.toLowerCase()];
    if (base) return `${base}${url}`;
  }
  return null;
}

/** Unique id from an optional seed (used by file-upload for stable item keys). */
export function generateUniqueId(seed = ""): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return seed ? `${seed}-${rand}` : rand
}
