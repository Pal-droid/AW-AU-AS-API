// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind + clsx helper
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize anime titles for comparison
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/$$ita$$/g, "") // remove (ITA) tag
    .replace(/vs\.?\s*u-?20\s*japan/g, "2") // normalize "vs U-20 Japan" to "2"
    .replace(/:\s*episode\s*nagi/g, "nagi") // normalize ": Episode Nagi" to "nagi"
    .replace(/[^\w\s]/g, " ") // replace non-alphanumeric characters with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

/**
 * Parse anime IDs into base name, season, and optional language
 */
export function parseId(animeId: string) {
  const slug = animeId.split(".")[0].toLowerCase().trim();
  let parts = slug.split("-").filter((p) => p);

  let lang: string | undefined;
  if (parts.includes("ita")) {
    lang = "ita";
    parts = parts.filter((p) => p !== "ita");
  }

  let season = 0;

  // Specific patterns first
  if (parts.includes("vs") && parts.includes("u") && parts.includes("20") && parts.includes("japan")) {
    season = 2;
    parts = parts.filter((p) => !["vs", "u", "20", "japan"].includes(p));
  } else if (parts.includes("episode") && parts.includes("nagi")) {
    season = 0;
    parts = parts.filter((p) => !["episode", "nagi"].includes(p));
  } else if (parts.length > 0 && /^\d+$/.test(parts[parts.length - 1])) {
    season = Number.parseInt(parts[parts.length - 1]);
    parts = parts.slice(0, -1);
  }

  const base = parts.join("-");
  return { base, season, lang };
}
