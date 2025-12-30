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
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }

  return matrix[len1][len2]
}

/**
 * Convert Levenshtein distance to similarity score (0-1)
 * Higher score = more similar strings
 */
export function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
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

  // Season pattern detection - map season names/ordinals to numbers
  const seasonPatterns: Record<string, number> = {
    // English ordinals
    first: 1,
    "1st": 1,
    second: 2,
    "2nd": 2,
    third: 3,
    "3rd": 3,
    fourth: 4,
    "4th": 4,
    fifth: 5,
    "5th": 5,
    sixth: 6,
    "6th": 6,
    seventh: 7,
    "7th": 7,
    eighth: 8,
    "8th": 8,
    ninth: 9,
    "9th": 9,
    tenth: 10,
    "10th": 10,
    // Italian
    prima: 1,
    primo: 1,
    seconda: 2,
    secondo: 2,
    terza: 3,
    terzo: 3,
    quarta: 4,
    quarto: 4,
    quinta: 5,
    quinto: 5,
    // Spanish
    primera: 1,
    primero: 1,
    segunda: 2,
    segundo: 2,
    tercera: 3,
    tercero: 3,
    cuarta: 4,
    cuarto: 4,
    quinta: 5,
    quinto: 5,
    // Roman numerals
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  }

  // Season keywords to remove after processing
  const seasonKeywords = [
    "season",
    "seasons",
    "s",
    "stagione",
    "stagioni", // Italian
    "saison",
    "saisons", // French
    "temporada",
    "temporadas", // Spanish
    "staffel",
    "staffeln", // German
  ]

  // Check for season patterns and normalize them
  let foundSeason = false

  // Pattern 1: "season-2", "2nd-season", etc.
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    // Check if this part is a season keyword
    if (seasonKeywords.includes(part)) {
      // Look at adjacent parts for numbers
      if (i > 0 && /^\d+$/.test(parts[i - 1])) {
        season = Number.parseInt(parts[i - 1])
        parts.splice(i - 1, 2) // Remove both number and season keyword
        foundSeason = true
        break
      } else if (i < parts.length - 1 && /^\d+$/.test(parts[i + 1])) {
        season = Number.parseInt(parts[i + 1])
        parts.splice(i, 2) // Remove both season keyword and number
        foundSeason = true
        break
      } else if (i > 0 && seasonPatterns[parts[i - 1]]) {
        season = seasonPatterns[parts[i - 1]]
        parts.splice(i - 1, 2)
        foundSeason = true
        break
      } else if (i < parts.length - 1 && seasonPatterns[parts[i + 1]]) {
        season = seasonPatterns[parts[i + 1]]
        parts.splice(i, 2)
        foundSeason = true
        break
      } else {
        // Just "season" without number = season 1
        parts.splice(i, 1)
        foundSeason = true
        break
      }
    }

    // Check if this part is a season number/ordinal pattern
    if (seasonPatterns[part]) {
      // Check if next part is a season keyword
      if (i < parts.length - 1 && seasonKeywords.includes(parts[i + 1])) {
        season = seasonPatterns[part]
        parts.splice(i, 2)
        foundSeason = true
        break
      }
    }
  }

  // Pattern 2: Ordinal/number at the end without explicit "season" keyword
  if (!foundSeason && parts.length > 0) {
    const lastPart = parts[parts.length - 1]

    // Pure number at the end
    if (/^\d+$/.test(lastPart)) {
      season = Number.parseInt(lastPart)
      parts = parts.slice(0, -1)
      foundSeason = true
    }
    // Ordinal suffix: "2nd", "3rd", etc.
    else if (/^\d+(st|nd|rd|th)$/.test(lastPart)) {
      season = Number.parseInt(lastPart.replace(/[^\d]/g, ""))
      parts = parts.slice(0, -1)
      foundSeason = true
    }
    // Named ordinal or roman numeral at the end
    else if (seasonPatterns[lastPart]) {
      season = seasonPatterns[lastPart]
      parts = parts.slice(0, -1)
      foundSeason = true
    }
  }

  // Specific patterns for edge cases
  if (!foundSeason) {
    if (parts.includes("vs") && parts.includes("u") && parts.includes("20") && parts.includes("japan")) {
      season = 2
      parts = parts.filter((p) => !["vs", "u", "20", "japan"].includes(p))
    } else if (parts.includes("episode") && parts.includes("nagi")) {
      season = 0
      parts = parts.filter((p) => !["episode", "nagi"].includes(p))
    }
  }

  const base = parts.join("-")
  return { base, season, lang }
}
