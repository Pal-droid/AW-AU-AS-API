import stringSimilarity from "string-similarity"
import { parseId, normalizeTitle } from "./utils"

/**
 * Check if two normalized titles have significant word differences
 * Returns true if they should NOT be matched (i.e., they are different anime)
 */
function hasSignificantDifference(title1: string, title2: string): boolean {
  const words1 = title1.split(" ").filter((w) => w.length > 0)
  const words2 = title2.split(" ").filter((w) => w.length > 0)

  // Common words that don't indicate a different anime (season/part indicators)
  const commonWords = new Set(["season", "s", "part", "cour", "the", "and", "of", "a", "an"])

  const languageTags = new Set([
    "ita",
    "sub",
    "dub",
    "eng",
    "jpn",
    "jap",
    "esp",
    "fra",
    "ger",
    "deu",
    "subita",
    "dubbed",
    "subbed",
    "italian",
    "english",
    "japanese",
    "spanish",
  ])

  const hasLangTag1 = words1.some((w) => languageTags.has(w))
  const hasLangTag2 = words2.some((w) => languageTags.has(w))

  if (hasLangTag1 !== hasLangTag2) {
    console.log(`[v0] Language tag asymmetry: "${title1}" (${hasLangTag1}) vs "${title2}" (${hasLangTag2})`)
    return true
  }

  // Get unique words in each title (excluding common words and language tags)
  const unique1 = words1.filter((w) => !words2.includes(w) && !commonWords.has(w) && !languageTags.has(w))
  const unique2 = words2.filter((w) => !words1.includes(w) && !commonWords.has(w) && !languageTags.has(w))

  const numbers1 = unique1.filter((w) => /^\d+$/.test(w))
  const numbers2 = unique2.filter((w) => /^\d+$/.test(w))

  // If one has season numbers and the other doesn't, they're different
  // OR if both have different season numbers, they're different
  if (numbers1.length > 0 || numbers2.length > 0) {
    if (numbers1.length !== numbers2.length) {
      return true
    }
    // Both have numbers - check if they're different
    if (numbers1.length > 0 && numbers2.length > 0) {
      const hasDifferentNumbers = numbers1.some((n1) => !numbers2.includes(n1))
      if (hasDifferentNumbers) {
        return true
      }
    }
  }

  // If either title has significant unique words (length > 2), they might be different
  const hasSignificantUnique1 = unique1.some((w) => w.length > 2)
  const hasSignificantUnique2 = unique2.some((w) => w.length > 2)

  return hasSignificantUnique1 && hasSignificantUnique2
}

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
        const normalizedAW = normalizeTitle(awTitle)
        const normalizedAS = normalizeTitle(asTitle)

        if (hasSignificantDifference(normalizedAW, normalizedAS)) {
          console.log(`[v1] Significant difference detected: "${normalizedAW}" vs "${normalizedAS}"`)
          return false
        }

        const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS)

        console.log(`[v1] Same base, title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)

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

    if (hasSignificantDifference(normalizedAW, normalizedAS)) {
      console.log(`[v1] Significant difference detected: "${normalizedAW}" vs "${normalizedAS}"`)
      return false
    }

    const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS)
    console.log(`[v1] Title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)
    return similarity >= 0.75
  }

  return false
}

/**
 * Async duplicate detection and merging for AnimeWorld + AnimeSaturn + AnimePahe + AniUnity results
 */
export async function detectDuplicates(
  animeworldResults: any[],
  animesaturnResults: any[],
  animepaheResults: any[] = [],
  aniunityResults: any[] = [],
): Promise<any[]> {
  const unifiedResults: any[] = []
  const usedAnimesaturn = new Set<number>()
  const usedAnimePahe = new Set<number>()
  const usedAniUnity = new Set<number>()

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

      if (hasSignificantDifference(normalizedAW, normalizedAP)) {
        continue
      }

      const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAP)

      if (similarity >= 0.75) {
        apMatch = [i, apResult]
        break
      }
    }

    let auMatch: [number, any] | null = null
    for (let i = 0; i < aniunityResults.length; i++) {
      if (usedAniUnity.has(i)) continue
      const auResult = aniunityResults[i]

      // AniUnity uses title-based matching since IDs are different format
      const normalizedAW = normalizeTitle(awResult.title)
      const normalizedAU = normalizeTitle(auResult.title)

      if (hasSignificantDifference(normalizedAW, normalizedAU)) {
        continue
      }

      const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAU)

      if (similarity >= 0.75) {
        auMatch = [i, auResult]
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

      if (auMatch) {
        const [k, auResult] = auMatch
        usedAniUnity.add(k)
        sources.push({ name: "AniUnity", url: auResult.url, id: auResult.id })
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

      if (auMatch) {
        const [k, auResult] = auMatch
        usedAniUnity.add(k)
        sources.push({ name: "AniUnity", url: auResult.url, id: auResult.id })
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

        if (hasSignificantDifference(normalizedAS, normalizedAP)) {
          continue
        }

        const similarity = stringSimilarity.compareTwoStrings(normalizedAS, normalizedAP)

        if (similarity >= 0.75) {
          apMatch = [j, apResult]
          break
        }
      }

      let auMatch: [number, any] | null = null
      for (let j = 0; j < aniunityResults.length; j++) {
        if (usedAniUnity.has(j)) continue
        const auResult = aniunityResults[j]

        const normalizedAS = normalizeTitle(asResult.title)
        const normalizedAU = normalizeTitle(auResult.title)

        if (hasSignificantDifference(normalizedAS, normalizedAU)) {
          continue
        }

        const similarity = stringSimilarity.compareTwoStrings(normalizedAS, normalizedAU)

        if (similarity >= 0.75) {
          auMatch = [j, auResult]
          break
        }
      }

      if (apMatch) {
        const [j, apResult] = apMatch
        usedAnimePahe.add(j)
        sources.push({ name: "AnimePahe", url: apResult.url, id: apResult.id })
      }

      if (auMatch) {
        const [j, auResult] = auMatch
        usedAniUnity.add(j)
        sources.push({ name: "AniUnity", url: auResult.url, id: auResult.id })
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
      const sources = [{ name: "AnimePahe", url: apResult.url, id: apResult.id }]

      let auMatch: [number, any] | null = null
      for (let j = 0; j < aniunityResults.length; j++) {
        if (usedAniUnity.has(j)) continue
        const auResult = aniunityResults[j]

        const normalizedAP = normalizeTitle(apResult.title)
        const normalizedAU = normalizeTitle(auResult.title)

        if (hasSignificantDifference(normalizedAP, normalizedAU)) {
          continue
        }

        const similarity = stringSimilarity.compareTwoStrings(normalizedAP, normalizedAU)

        if (similarity >= 0.75) {
          auMatch = [j, auResult]
          break
        }
      }

      if (auMatch) {
        const [j, auResult] = auMatch
        usedAniUnity.add(j)
        sources.push({ name: "AniUnity", url: auResult.url, id: auResult.id })
      }

      unifiedResults.push({
        title: apResult.title,
        description: apResult.description,
        images: { poster: apResult.poster, cover: apResult.cover },
        sources,
        has_multi_servers: sources.length > 1,
      })
    }
  }

  for (let i = 0; i < aniunityResults.length; i++) {
    if (!usedAniUnity.has(i)) {
      const auResult = aniunityResults[i]
      unifiedResults.push({
        title: auResult.title,
        description: auResult.description,
        images: { poster: auResult.poster, cover: auResult.cover },
        sources: [{ name: "AniUnity", url: auResult.url, id: auResult.id }],
        has_multi_servers: false,
      })
    }
  }

  return unifiedResults
}
