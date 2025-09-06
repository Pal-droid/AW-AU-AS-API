import type { SearchResult, AnimeSource } from "./models"
import stringSimilarity from "string-similarity"

interface ParsedId {
  base: string
  season: number
  lang?: string
}

export function parseId(animeId: string): ParsedId {
  /**
   * Parse scraped anime IDs into (base, season:int, lang:str|None).
   */
  const slug = animeId.split(".")[0].toLowerCase().trim()
  let parts = slug.split("-").filter((p) => p)

  let lang: string | undefined = undefined
  if (parts.includes("ita")) {
    lang = "ita"
    parts = parts.filter((p) => p !== "ita")
  }

  let season = 0

  // Check for specific season patterns first
  if (parts.includes("vs") && parts.includes("u") && parts.includes("20") && parts.includes("japan")) {
    // "blue-lock-vs-u-20-japan" -> season 2
    season = 2
    parts = parts.filter((p) => !["vs", "u", "20", "japan"].includes(p))
  } else if (parts.includes("episode") && parts.includes("nagi")) {
    // "blue-lock-episode-nagi" -> special episode (season 0)
    season = 0
    parts = parts.filter((p) => !["episode", "nagi"].includes(p))
  } else if (parts.length > 0 && /^\d+$/.test(parts[parts.length - 1])) {
    // Standard numeric season at the end
    season = Number.parseInt(parts[parts.length - 1])
    parts = parts.slice(0, -1)
  }

  const base = parts.join("-")
  return { base, season, lang }
}

export function shouldMatch(awId: string, asId: string, awTitle?: string, asTitle?: string): boolean {
  /**Match using ID parsing first, then fallback to title similarity if provided.*/

  // Try exact ID matching first
  try {
    const awParsed = parseId(awId)
    const asParsed = parseId(asId)

    if (awParsed.base === asParsed.base) {
      // Same base anime
      if (awParsed.season === asParsed.season && awParsed.lang === asParsed.lang) {
        // Exact match
        console.log(`[v0] Exact ID match: ${awId} <-> ${asId}`)
        return true
      }

      // Same base but different season/lang - use title similarity to confirm
      if (awTitle && asTitle) {
        const normalizedAW = normalizeTitle(awTitle)
        const normalizedAS = normalizeTitle(asTitle)
        const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS)
        console.log(`[v0] Same base, checking title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)
        return similarity >= 0.6 // Lower threshold for same base anime
      }
    }
  } catch (error) {
    console.log(`[v0] ID parsing failed: ${error}`)
  }

  // Fallback to title similarity if titles are provided
  if (awTitle && asTitle) {
    const normalizedAW = normalizeTitle(awTitle)
    const normalizedAS = normalizeTitle(asTitle)
    const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS)
    console.log(`[v0] Title similarity between "${normalizedAW}" and "${normalizedAS}": ${similarity}`)
    return similarity >= 0.75 // Higher threshold for title-only matches
  }

  return false
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/$$ita$$/g, "") // remove (ITA) tag
    .replace(/vs\.?\s*u-?20\s*japan/g, "2") // normalize "vs. U-20 Japan" to "2"
    .replace(/:\s*episode\s*nagi/g, "nagi") // normalize ": Episode Nagi" to "nagi"
    .replace(/[^\w\s]/g, " ") // replace all non-alphanumeric characters with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim()
}

export function detectDuplicates(animeworldResults: any[], animesaturnResults: any[]): SearchResult[] {
  /**Detect duplicates and merge results from different sources using improved matching.*/
  const unifiedResults: SearchResult[] = []
  const usedAnimesaturn = new Set<number>()

  console.log(
    `[v0] Starting duplicate detection with ${animeworldResults.length} AW and ${animesaturnResults.length} AS results`,
  )

  // Process AnimeWorld results first
  for (const awResult of animeworldResults) {
    const sources: AnimeSource[] = [
      {
        name: "AnimeWorld",
        url: awResult.url,
        id: awResult.id,
      },
    ]

    let bestMatch: [number, any] | null = null
    let bestScore = 0

    for (let i = 0; i < animesaturnResults.length; i++) {
      if (usedAnimesaturn.has(i)) {
        continue
      }

      const asResult = animesaturnResults[i]

      // Try ID-based matching first
      if (shouldMatch(awResult.id, asResult.id)) {
        bestMatch = [i, asResult]
        bestScore = 1.0 // Perfect ID match
        console.log(`[v0] ID match found: ${awResult.id} <-> ${asResult.id}`)
        break
      }

      // Try title-based matching as fallback
      if (awResult.title && asResult.title) {
        const similarity = stringSimilarity.compareTwoStrings(
          normalizeTitle(awResult.title),
          normalizeTitle(asResult.title),
        )

        if (similarity >= 0.75 && similarity > bestScore) {
          bestMatch = [i, asResult]
          bestScore = similarity
          console.log(`[v0] Title match found: "${awResult.title}" <-> "${asResult.title}" (${similarity})`)
        }
      }
    }

    // Merge if match found
    let description: string | undefined
    let images: { poster?: string; cover?: string }

    if (bestMatch) {
      const [i, asResult] = bestMatch
      usedAnimesaturn.add(i)

      sources.push({
        name: "AnimeSaturn",
        url: asResult.url,
        id: asResult.id,
      })

      description = asResult.description || awResult.description
      images = {
        poster: asResult.poster || awResult.poster,
        cover: asResult.cover || awResult.cover,
      }

      console.log(`[v0] Merged result: "${awResult.title}" with score ${bestScore}`)
    } else {
      description = awResult.description
      images = {
        poster: awResult.poster,
        cover: awResult.cover,
      }
      console.log(`[v0] No match found for: "${awResult.title}"`)
    }

    unifiedResults.push({
      title: awResult.title,
      description,
      images,
      sources,
      has_multi_servers: sources.length > 1,
    })
  }

  // Add remaining unmatched AnimeSaturn results
  for (let i = 0; i < animesaturnResults.length; i++) {
    if (!usedAnimesaturn.has(i)) {
      const asResult = animesaturnResults[i]
      console.log(`[v0] Adding unmatched AnimeSaturn result: "${asResult.title}"`)
      unifiedResults.push({
        title: asResult.title,
        description: asResult.description,
        images: {
          poster: asResult.poster,
          cover: asResult.cover,
        },
        sources: [
          {
            name: "AnimeSaturn",
            url: asResult.url,
            id: asResult.id,
          },
        ],
        has_multi_servers: false,
      })
    }
  }

  console.log(`[v0] Final unified results: ${unifiedResults.length} total`)
  return unifiedResults
}
