import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Unique id from an optional seed (used by file-upload for stable item keys). */
export function generateUniqueId(seed = ""): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return seed ? `${seed}-${rand}` : rand
}
