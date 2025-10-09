import stringSimilarity from "string-similarity"
import translate from "@vitalets/google-translate-api" // npm i @vitalets/google-translate-api
import { parseId, normalizeTitle } from "./utils" // make sure these exist and are exported

/**
 * Async title/ID matcher with translation support
 */
export async function shouldMatch(awId: string, asId: string, awTitle?: string, asTitle?: string): Promise<boolean> {
  try {
    const awParsed = parseId(awId)
    const asParsed = parseId(asId)

    if (awParsed.base === asParsed.base) {
      if (awParsed.season === asParsed.season && awParsed.lang === asParsed.lang) {
        console.log(`[v1] Exact ID match: ${awId} <-> ${asId}`)
        return true
      }

      // Same base but different season/lang → compare translated titles
      if (awTitle && asTitle) {
        const normalizedAS = normalizeTitle(asTitle)
        const translation = await translate(awTitle, { to: "en" })
        const normalizedAWTranslated = normalizeTitle(translation.text)

        const similarity = stringSimilarity.compareTwoStrings(normalizedAWTranslated, normalizedAS)

        console.log(
          `[v1] Same base, translated title similarity: "${normalizedAWTranslated}" vs "${normalizedAS}" = ${similarity}`,
        )

        return similarity >= 0.6 // lower threshold for same-base comparison
      }
    }
  } catch (error) {
    console.log(`[v1] ID parsing failed: ${error}`)
  }

  // Fallback: compare titles directly
  if (awTitle && asTitle) {
    const normalizedAW = normalizeTitle(awTitle)
    const normalizedAS = normalizeTitle(asTitle)
    const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS)
    console.log(`[v1] Title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)
    return similarity >= 0.75
  }

  return false
}

/**
 * Async duplicate detection and merging for AnimeWorld + AnimeSaturn + AnimePahe results
 */
export async function detectDuplicates(
  animeworldResults: any[],
  animesaturnResults: any[],
  animepaheResults: any[] = [],
): Promise<any[]> {
  const unifiedResults: any[] = []
  const usedAnimesaturn = new Set<number>()
  const usedAnimePahe = new Set<number>()

  for (const awResult of animeworldResults) {
    const sources = [{ name: "AnimeWorld", url: awResult.url, id: awResult.id }]
    let bestMatch: [number, any] | null = null

    for (let i = 0; i < animesaturnResults.length; i++) {
      if (usedAnimesaturn.has(i)) continue
      const asResult = animesaturnResults[i]

      if (await shouldMatch(awResult.id, asResult.id, awResult.title, asResult.title)) {
        bestMatch = [i, asResult]
        break
      }
    }

    let apMatch: [number, any] | null = null
    for (let i = 0; i < animepaheResults.length; i++) {
      if (usedAnimePahe.has(i)) continue
      const apResult = animepaheResults[i]

      // AnimePahe uses title-based matching since IDs are different format
      const normalizedAW = normalizeTitle(awResult.title)
      const normalizedAP = normalizeTitle(apResult.title)
      const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAP)

      if (similarity >= 0.75) {
        apMatch = [i, apResult]
        break
      }
    }

    if (bestMatch) {
      const [i, asResult] = bestMatch
      usedAnimesaturn.add(i)
      sources.push({ name: "AnimeSaturn", url: asResult.url, id: asResult.id })

      if (apMatch) {
        const [j, apResult] = apMatch
        usedAnimePahe.add(j)
        sources.push({ name: "AnimePahe", url: apResult.url, id: apResult.id })
      }

      unifiedResults.push({
        title: awResult.title,
        description: asResult.description || awResult.description,
        images: {
          poster: asResult.poster || awResult.poster,
          cover: asResult.cover || awResult.cover,
        },
        sources,
        has_multi_servers: sources.length > 1,
      })
    } else {
      if (apMatch) {
        const [j, apResult] = apMatch
        usedAnimePahe.add(j)
        sources.push({ name: "AnimePahe", url: apResult.url, id: apResult.id })
      }

      unifiedResults.push({
        title: awResult.title,
        description: awResult.description,
        images: { poster: awResult.poster, cover: awResult.cover },
        sources,
        has_multi_servers: sources.length > 1,
      })
    }
  }

  // Add remaining unmatched AnimeSaturn results
  for (let i = 0; i < animesaturnResults.length; i++) {
    if (!usedAnimesaturn.has(i)) {
      const asResult = animesaturnResults[i]
      const sources = [{ name: "AnimeSaturn", url: asResult.url, id: asResult.id }]

      let apMatch: [number, any] | null = null
      for (let j = 0; j < animepaheResults.length; j++) {
        if (usedAnimePahe.has(j)) continue
        const apResult = animepaheResults[j]

        const normalizedAS = normalizeTitle(asResult.title)
        const normalizedAP = normalizeTitle(apResult.title)
        const similarity = stringSimilarity.compareTwoStrings(normalizedAS, normalizedAP)

        if (similarity >= 0.75) {
          apMatch = [j, apResult]
          break
        }
      }

      if (apMatch) {
        const [j, apResult] = apMatch
        usedAnimePahe.add(j)
        sources.push({ name: "AnimePahe", url: apResult.url, id: apResult.id })
      }

      unifiedResults.push({
        title: asResult.title,
        description: asResult.description,
        images: { poster: asResult.poster, cover: asResult.cover },
        sources,
        has_multi_servers: sources.length > 1,
      })
    }
  }

  // Added remaining unmatched AnimePahe results
  for (let i = 0; i < animepaheResults.length; i++) {
    if (!usedAnimePahe.has(i)) {
      const apResult = animepaheResults[i]
      unifiedResults.push({
        title: apResult.title,
        description: apResult.description,
        images: { poster: apResult.poster, cover: apResult.cover },
        sources: [{ name: "AnimePahe", url: apResult.url, id: apResult.id }],
        has_multi_servers: false,
      })
    }
  }

  return unifiedResults
}
