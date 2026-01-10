/**
 * AniList-based anime matching system
 * Groups anime sources based on AniList canonical data
 */

import { anilistService, type AniListAnime, type AniListSearchResult } from "./anilist"
import { normalizeTitle, stringSimilarity, cleanTitle } from "./utils"

export interface SourceAnime {
  title: string
  id: string
  url?: string
  poster?: string
  description?: string
  source: string
  altTitle?: string
  jtitle?: string
  isItalianDub?: boolean
  originalTitle?: string // Title before stripping (ITA)
}

export interface AnimeGroup {
  anilistId: number | null
  anilistData: AniListAnime | null
  sources: SourceAnime[]
  isItalianDub: boolean
}

/**
 * Check if a title matches AniList result (romaji, english, or synonyms)
 */
function matchesAniListResult(title: string, anilistResult: AniListAnime, threshold = 0.75): boolean {
  const normalizedTitle = normalizeTitle(cleanTitle(title))

  // Check romaji
  if (anilistResult.title.romaji) {
    const normalizedRomaji = normalizeTitle(cleanTitle(anilistResult.title.romaji))
    const similarity = stringSimilarity(normalizedTitle, normalizedRomaji)
    if (similarity >= threshold) {
      console.log(
        `[AniList-Match] "${title}" matches romaji "${anilistResult.title.romaji}" (${similarity.toFixed(2)})`,
      )
      return true
    }
  }

  // Check english
  if (anilistResult.title.english) {
    const normalizedEnglish = normalizeTitle(cleanTitle(anilistResult.title.english))
    const similarity = stringSimilarity(normalizedTitle, normalizedEnglish)
    if (similarity >= threshold) {
      console.log(
        `[AniList-Match] "${title}" matches english "${anilistResult.title.english}" (${similarity.toFixed(2)})`,
      )
      return true
    }
  }

  // Check synonyms
  for (const synonym of anilistResult.synonyms) {
    const normalizedSynonym = normalizeTitle(cleanTitle(synonym))
    const similarity = stringSimilarity(normalizedTitle, normalizedSynonym)
    if (similarity >= threshold) {
      console.log(`[AniList-Match] "${title}" matches synonym "${synonym}" (${similarity.toFixed(2)})`)
      return true
    }
  }

  return false
}

/**
 * Strip (ITA) tag from title and detect Italian dubs
 */
function processItalianTag(title: string): { cleanedTitle: string; isItalianDub: boolean } {
  // Fixed regex - use $$ and $$ to match literal parentheses
  const itaRegex = /\s*\(ITA\)\s*$/i;

  const itaMatch = title.match(itaRegex);
    if (itaMatch) {
      return {
      cleanedTitle: title.replace(itaRegex, "").trim(),
      isItalianDub: true,
    };
  }
  return { cleanedTitle: title, isItalianDub: false };
}

/**
 * Get unique titles to query AniList with
 * Returns a map of normalized title -> original title(s)
 */
function getUniqueTitles(sources: SourceAnime[]): Map<string, string[]> {
  const titleMap = new Map<string, string[]>()

  for (const source of sources) {
    // so we just use it directly instead of processing it again
    const normalized = normalizeTitle(cleanTitle(source.title))

    if (!titleMap.has(normalized)) {
      titleMap.set(normalized, [])
    }
    titleMap.get(normalized)!.push(source.title)
  }

  return titleMap
}

/**
 * Create a unique group key for an anime
 * Format: ${anilistId}-${ITA|SUB}
 */
function createGroupKey(anilistId: number, isItalian: boolean): string {
  return `${anilistId}-${isItalian ? "ITA" : "SUB"}`
}

/**
 * Main function to match sources using AniList
 * Returns grouped results based on AniList data
 */
export async function matchWithAniList(
  allSources: SourceAnime[],
): Promise<{ groups: AnimeGroup[]; usedFallback: boolean; rateLimited: boolean }> {
  console.log(`[AniList-Matcher] Starting match for ${allSources.length} sources`)

  const processedSources = allSources.map((source) => {
    const { cleanedTitle, isItalianDub } = processItalianTag(source.title)
    console.log(`[v0] Processing source: "${source.title}" -> cleaned: "${cleanedTitle}", isItalian: ${isItalianDub}`)
    return {
      ...source,
      originalTitle: source.title,
      title: cleanedTitle,
      isItalianDub,
    }
  })

  // Get unique titles to query (use cleaned titles without ITA suffix)
  const uniqueTitles = getUniqueTitles(processedSources)
  console.log(`[AniList-Matcher] Found ${uniqueTitles.size} unique titles to query`)

  // Query AniList for each unique title
  const anilistResults = new Map<string, AniListSearchResult>()
  let wasRateLimited = false

  for (const [normalizedTitle, originalTitles] of uniqueTitles) {
    const queryTitle = originalTitles[0]
    const result = await anilistService.search(queryTitle)

    anilistResults.set(normalizedTitle, result)

    if (result.error === "RATE_LIMITED") {
      wasRateLimited = true
      console.log(`[AniList-Matcher] Rate limited, will fallback for remaining`)
      break
    }
  }

  // If we got rate limited before any results, return early with fallback flag
  if (wasRateLimited && anilistResults.size === 0) {
    console.log(`[AniList-Matcher] Immediately rate limited, using fallback`)
    return { groups: [], usedFallback: true, rateLimited: true }
  }

  const groups = new Map<string, AnimeGroup>()
  const unmatchedSources: SourceAnime[] = []

  for (const source of processedSources) {
    const normalizedTitle = normalizeTitle(cleanTitle(source.title))
    const anilistResult = anilistResults.get(normalizedTitle)

    let matchedAnilistId: number | null = null
    let matchedAnilistData: AniListAnime | null = null

    // Check if this source's title matches any AniList result we have
    if (anilistResult?.anime) {
      // Direct match from our query
      matchedAnilistId = anilistResult.anime.id
      matchedAnilistData = anilistResult.anime
    } else {
      // Check if it matches any other AniList result we already have
      for (const [, result] of anilistResults) {
        if (result.anime && matchesAniListResult(source.title, result.anime)) {
          matchedAnilistId = result.anime.id
          matchedAnilistData = result.anime
          break
        }
      }
    }

    if (matchedAnilistId !== null) {
      const groupKey = createGroupKey(matchedAnilistId, source.isItalianDub)
      console.log(`[v0] Source "${source.originalTitle}" -> groupKey: ${groupKey}`)

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          anilistId: matchedAnilistId,
          anilistData: matchedAnilistData,
          sources: [],
          isItalianDub: source.isItalianDub,
        })
      }
      groups.get(groupKey)!.sources.push(source)
    } else {
      unmatchedSources.push(source)
    }
  }

  // Handle unmatched sources - try to query AniList for their specific titles
  for (const source of unmatchedSources) {
    if (wasRateLimited) {
      continue
    }

    const normalizedTitle = normalizeTitle(cleanTitle(source.title))

    if (anilistResults.has(normalizedTitle)) {
      continue
    }

    const result = await anilistService.search(source.title)
    anilistResults.set(normalizedTitle, result)

    if (result.error === "RATE_LIMITED") {
      wasRateLimited = true
      console.log(`[AniList-Matcher] Rate limited during unmatched processing`)
      break
    }

    if (result.anime) {
      const groupKey = createGroupKey(result.anime.id, source.isItalianDub)
      console.log(`[v0] Unmatched source "${source.originalTitle}" -> groupKey: ${groupKey}`)

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          anilistId: result.anime.id,
          anilistData: result.anime,
          sources: [],
          isItalianDub: source.isItalianDub,
        })
      }
      groups.get(groupKey)!.sources.push(source)
    }
  }

  console.log(`[AniList-Matcher] Created ${groups.size} groups`)
  for (const [key, group] of groups) {
    console.log(`[v0] Group "${key}": ${group.sources.length} sources, isItalian: ${group.isItalianDub}`)
  }

  return {
    groups: Array.from(groups.values()),
    usedFallback: false,
    rateLimited: wasRateLimited,
  }
}

/**
 * Convert AniList groups to the unified search result format
 */
export function convertGroupsToResults(groups: AnimeGroup[]): any[] {
  return groups.map((group) => {
    // Use the first source's title as the main title
    // Or use AniList English/Romaji if available
    let title = group.sources[0]?.originalTitle || group.sources[0]?.title || "Unknown"

    if (group.anilistData?.title.english) {
      title = group.anilistData.title.english
    } else if (group.anilistData?.title.romaji) {
      title = group.anilistData.title.romaji
    }

    // Add (ITA) suffix back for Italian dubs
    if (group.isItalianDub && !title.includes("(ITA)")) {
      title = `${title} (ITA)`
    }

    const sources = group.sources.map((s) => ({
      name: s.source,
      url: s.url,
      id: s.id,
    }))

    // Get best poster/description from sources
    const poster = group.sources.find((s) => s.poster)?.poster
    const description = group.sources.find((s) => s.description)?.description

    return {
      title,
      description,
      images: {
        poster,
        cover: undefined,
      },
      sources,
      has_multi_servers: sources.length > 1,
      anilistId: group.anilistId,
    }
  })
}
