// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind + clsx helper
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize anime titles for comparison
 */
export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase()

  // Map ordinal words to numbers (English, Italian, Spanish, French, German)
  const ordinalMap: Record<string, string> = {
    // English
    first: "1",
    second: "2",
    third: "3",
    fourth: "4",
    fifth: "5",
    sixth: "6",
    seventh: "7",
    eighth: "8",
    ninth: "9",
    tenth: "10",
    // Italian
    prima: "1",
    primo: "1",
    seconda: "2",
    secondo: "2",
    terza: "3",
    terzo: "3",
    quarta: "4",
    quarto: "4",
    quinta: "5",
    quinto: "5",
    // Spanish
    primera: "1",
    primero: "1",
    segunda: "2",
    segundo: "2",
    tercera: "3",
    tercero: "3",
    cuarta: "4",
    cuarto: "4",
    quinta: "5",
    quinto: "5",
    // French
    première: "1",
    premier: "1",
    deuxième: "2",
    troisième: "3",
    quatrième: "4",
    cinquième: "5",
    // German
    erste: "1",
    erster: "1",
    zweite: "2",
    zweiter: "2",
    dritte: "3",
    dritter: "3",
    vierte: "4",
    vierter: "4",
    fünfte: "5",
    fünfter: "5",
  }

  // Convert Roman numerals to Arabic numbers
  const romanMap: Record<string, string> = {
    i: "1",
    ii: "2",
    iii: "3",
    iv: "4",
    v: "5",
    vi: "6",
    vii: "7",
    viii: "8",
    ix: "9",
    x: "10",
  }

  // Season keywords in multiple languages
  const seasonWords = [
    "season",
    "seasons",
    "s",
    "stagione",
    "stagioni", // Italian
    "saison",
    "saisons", // French
    "temporada",
    "temporadas", // Spanish
    "staffel", // German
    "seizoen", // Dutch
    "sezon", // Polish/Turkish
  ]

  // Replace ordinal words with numbers
  Object.entries(ordinalMap).forEach(([word, num]) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    normalized = normalized.replace(regex, num)
  })

  // Replace season patterns: "season 2", "stagione 2", "s2", "s 2", etc.
  seasonWords.forEach((seasonWord) => {
    // Pattern: "season 2" or "stagione 2"
    const regex1 = new RegExp(`\\b${seasonWord}\\s+(\\d+)`, "gi")
    normalized = normalized.replace(regex1, "$1")

    // Pattern: "s2" (no space)
    if (seasonWord.length <= 2) {
      const regex2 = new RegExp(`\\b${seasonWord}(\\d+)`, "gi")
      normalized = normalized.replace(regex2, "$1")
    }
  })

  // Replace standalone Roman numerals (when surrounded by spaces or at end)
  Object.entries(romanMap).forEach(([roman, num]) => {
    const regex = new RegExp(`\\b${roman}\\b`, "gi")
    normalized = normalized.replace(regex, num)
  })

  // Replace ordinal suffixes: "2nd", "3rd", "4th" → "2", "3", "4"
  normalized = normalized.replace(/(\d+)(?:st|nd|rd|th)\b/g, "$1")

  return normalized
    .replace(/$$ita$$/g, "") // remove (ITA) tag
    .replace(/vs\.?\s*u-?20\s*japan/g, "2") // normalize "vs U-20 Japan" to "2"
    .replace(/:\s*episode\s*nagi/g, "nagi") // normalize ": Episode Nagi" to "nagi"
    .replace(/[^\w\s]/g, " ") // replace non-alphanumeric characters with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim()
}

/**
 * Parse anime IDs into base name, season, and optional language
 */
export function parseId(animeId: string) {
  const slug = animeId.split(".")[0].toLowerCase().trim()
  let parts = slug.split("-").filter((p) => p)

  let lang: string | undefined
  if (parts.includes("ita")) {
    lang = "ita"
    parts = parts.filter((p) => p !== "ita")
  }

  let season = 0

  // Specific patterns first
  if (parts.includes("vs") && parts.includes("u") && parts.includes("20") && parts.includes("japan")) {
    season = 2
    parts = parts.filter((p) => !["vs", "u", "20", "japan"].includes(p))
  } else if (parts.includes("episode") && parts.includes("nagi")) {
    season = 0
    parts = parts.filter((p) => !["episode", "nagi"].includes(p))
  } else if (parts.length > 0 && /^\d+$/.test(parts[parts.length - 1])) {
    season = Number.parseInt(parts[parts.length - 1])
    parts = parts.slice(0, -1)
  }

  const base = parts.join("-")
  return { base, season, lang }
}
