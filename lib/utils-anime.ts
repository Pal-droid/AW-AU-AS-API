import { parseId, normalizeTitle, stringSimilarity } from "./utils"

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

  // Check if one is a complete subset of the other (e.g., "tonikaku kawaii" vs "tonikaku kawaii sns")
  const allWords1 = new Set(words1)
  const allWords2 = new Set(words2)

  const isSubset1 = words1.every((w) => allWords2.has(w))
  const isSubset2 = words2.every((w) => allWords1.has(w))

  // If one is a subset but they're not equal, they're different anime (one has a subtitle)
  if ((isSubset1 || isSubset2) && words1.length !== words2.length) {
    console.log(`[v0] Subtitle detected: "${title1}" vs "${title2}" (one is subset of other)`)
    return true
  }

  // If either title has ANY unique words (excluding common words), they might be different
  // This catches cases like "sns", "seifuku", "ova", "special", etc.
  if (unique1.length > 0 || unique2.length > 0) {
    console.log(
      `[v0] Unique words detected: "${title1}" has [${unique1.join(", ")}], "${title2}" has [${unique2.join(", ")}]`,
    )
    return true
  }

  return false
}

/**
 * Check if original titles (before normalization) have subtitle differences
 * Returns true if they should NOT be matched
 */
function hasSubtitleDifference(title1: string, title2: string): boolean {
  // Check for colon-based subtitles (e.g., "Title: Subtitle")
  const hasColon1 = title1.includes(":")
  const hasColon2 = title2.includes(":")

  // If one has a colon subtitle and the other doesn't, they're different
  if (hasColon1 !== hasColon2) {
    console.log(`[v0] Colon subtitle asymmetry: "${title1}" vs "${title2}"`)
    return true
  }

  // If both have colons, check if the subtitles are different
  if (hasColon1 && hasColon2) {
    const subtitle1 = title1.split(":").slice(1).join(":").trim().toLowerCase()
    const subtitle2 = title2.split(":").slice(1).join(":").trim().toLowerCase()

    if (subtitle1 !== subtitle2) {
      console.log(`[v0] Different subtitles: "${subtitle1}" vs "${subtitle2}"`)
      return true
    }
  }

  return false
}

/**
 * Async title/ID matcher with translation support
 */
export async function shouldMatch(
  awId: string,
  asId: string,
  awTitle?: string,
  asTitle?: string,
  awAltTitle?: string,
): Promise<boolean> {
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
        if (hasSubtitleDifference(awTitle, asTitle)) {
          return false
        }

        const normalizedAW = normalizeTitle(awTitle)
        const normalizedAS = normalizeTitle(asTitle)

        if (hasSignificantDifference(normalizedAW, normalizedAS)) {
          console.log(`[v1] Significant difference detected: "${normalizedAW}" vs "${normalizedAS}"`)
          return false
        }

        const similarity = stringSimilarity(normalizedAW, normalizedAS)

        console.log(`[v1] Same base, title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)

        if (similarity >= 0.8) {
          return true
        }

        if (awAltTitle) {
          const normalizedAlt = normalizeTitle(awAltTitle)
          if (!hasSignificantDifference(normalizedAlt, normalizedAS)) {
            const altSimilarity = stringSimilarity(normalizedAlt, normalizedAS)
            console.log(
              `[v1] Same base, altTitle similarity: "${normalizedAlt}" vs "${normalizedAS}" = ${altSimilarity}`,
            )
            if (altSimilarity >= 0.8) {
              return true
            }
          }
        }

        return false
      }
    }
  } catch (error) {
    console.log(`[v1] ID parsing failed: ${error}`)
  }

  // Fallback: compare titles directly
  if (awTitle && asTitle) {
    if (hasSubtitleDifference(awTitle, asTitle)) {
      return false
    }

    const normalizedAW = normalizeTitle(awTitle)
    const normalizedAS = normalizeTitle(asTitle)

    if (hasSignificantDifference(normalizedAW, normalizedAS)) {
      console.log(`[v1] Significant difference detected: "${normalizedAW}" vs "${normalizedAS}"`)
      return false
    }

    const similarity = stringSimilarity(normalizedAW, normalizedAS)
    console.log(`[v1] Title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`)

    if (similarity >= 0.8) {
      return true
    }

    if (awAltTitle) {
      if (!hasSubtitleDifference(awAltTitle, asTitle)) {
        const normalizedAlt = normalizeTitle(awAltTitle)
        if (!hasSignificantDifference(normalizedAlt, normalizedAS)) {
          const altSimilarity = stringSimilarity(normalizedAlt, normalizedAS)
          console.log(`[v1] AltTitle similarity: "${normalizedAlt}" vs "${normalizedAS}" = ${altSimilarity}`)
          if (altSimilarity >= 0.8) {
            return true
          }
        }
      }
    }

    return false
  }

  return false
}

/**
 * Async duplicate detection and merging for AnimeWorld + AnimeSaturn + Unity results
 */
export async function detectDuplicates(
  animeworldResults: any[],
  animesaturnResults: any[],
  _animepaheResults: any[] = [],
  unityResults: any[] = [],
  heavenResults: any[] = [],
): Promise<any[]> {
  const unifiedResults: any[] = []
  const usedAnimesaturn = new Set<number>()
  const usedUnity = new Set<number>()
  const usedHeaven = new Set<number>()

  for (const awResult of animeworldResults) {
    const sources = [{ name: "AnimeWorld", url: awResult.url, id: awResult.id }]
    let bestMatch: [number, any] | null = null

    for (let i = 0; i < animesaturnResults.length; i++) {
      if (usedAnimesaturn.has(i)) continue
      const asResult = animesaturnResults[i]

      if (await shouldMatch(awResult.id, asResult.id, awResult.title, asResult.title, awResult.altTitle)) {
        bestMatch = [i, asResult]
        break
      }
    }

    let auMatch: [number, any] | null = null
    for (let i = 0; i < unityResults.length; i++) {
      if (usedUnity.has(i)) continue
      const auResult = unityResults[i]

      const normalizedAW = normalizeTitle(awResult.title)
      const normalizedAU = normalizeTitle(auResult.title)

      if (hasSignificantDifference(normalizedAW, normalizedAU)) {
        if (awResult.altTitle) {
          const normalizedAlt = normalizeTitle(awResult.altTitle)
          if (!hasSignificantDifference(normalizedAlt, normalizedAU)) {
            const altSimilarity = stringSimilarity(normalizedAlt, normalizedAU)
            console.log(`[v1] Unity altTitle similarity: "${normalizedAlt}" vs "${normalizedAU}" = ${altSimilarity}`)
            if (altSimilarity >= 0.8) {
              auMatch = [i, auResult]
              break
            }
          }
        }
        continue
      }

      const similarity = stringSimilarity(normalizedAW, normalizedAU)

      if (similarity >= 0.8) {
        auMatch = [i, auResult]
        break
      }

      if (awResult.altTitle) {
        const normalizedAlt = normalizeTitle(awResult.altTitle)
        if (!hasSignificantDifference(normalizedAlt, normalizedAU)) {
          const altSimilarity = stringSimilarity(normalizedAlt, normalizedAU)
          console.log(`[v1] Unity altTitle similarity: "${normalizedAlt}" vs "${normalizedAU}" = ${altSimilarity}`)
          if (altSimilarity >= 0.8) {
            auMatch = [i, auResult]
            break
          }
        }
      }
    }

    let hsMatch: [number, any] | null = null
    for (let i = 0; i < heavenResults.length; i++) {
      if (usedHeaven.has(i)) continue
      const hsResult = heavenResults[i]

      const normalizedAW = normalizeTitle(awResult.title)
      const normalizedHS = normalizeTitle(hsResult.title)

      if (hasSignificantDifference(normalizedAW, normalizedHS)) {
        if (awResult.altTitle) {
          const normalizedAlt = normalizeTitle(awResult.altTitle)
          if (!hasSignificantDifference(normalizedAlt, normalizedHS)) {
            const altSimilarity = stringSimilarity(normalizedAlt, normalizedHS)
            console.log(`[v1] Heaven altTitle similarity: "${normalizedAlt}" vs "${normalizedHS}" = ${altSimilarity}`)
            if (altSimilarity >= 0.8) {
              hsMatch = [i, hsResult]
              break
            }
          }
        }
        continue
      }

      const similarity = stringSimilarity(normalizedAW, normalizedHS)

      if (similarity >= 0.8) {
        hsMatch = [i, hsResult]
        break
      }

      if (awResult.altTitle) {
        const normalizedAlt = normalizeTitle(awResult.altTitle)
        if (!hasSignificantDifference(normalizedAlt, normalizedHS)) {
          const altSimilarity = stringSimilarity(normalizedAlt, normalizedHS)
          console.log(`[v1] Heaven altTitle similarity: "${normalizedAlt}" vs "${normalizedHS}" = ${altSimilarity}`)
          if (altSimilarity >= 0.8) {
            hsMatch = [i, hsResult]
            break
          }
        }
      }
    }

    if (bestMatch) {
      const [i, asResult] = bestMatch
      usedAnimesaturn.add(i)
      sources.push({ name: "AnimeSaturn", url: asResult.url, id: asResult.id })

      if (auMatch) {
        const [k, auResult] = auMatch
        usedUnity.add(k)
        sources.push({ name: "Unity", url: auResult.url, id: auResult.id })
      }

      if (hsMatch) {
        const [l, hsResult] = hsMatch
        usedHeaven.add(l)
        sources.push({ name: "Heaven", url: hsResult.url, id: hsResult.id })
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
      if (auMatch) {
        const [k, auResult] = auMatch
        usedUnity.add(k)
        sources.push({ name: "Unity", url: auResult.url, id: auResult.id })
      }

      if (hsMatch) {
        const [l, hsResult] = hsMatch
        usedHeaven.add(l)
        sources.push({ name: "Heaven", url: hsResult.url, id: hsResult.id })
      }

      unifiedResults.push({
        title: awResult.title,
        description: awResult.description,
        images: {
          poster:
            awResult.poster ||
            (auMatch ? auMatch[1].poster : null) ||
            (hsMatch ? hsMatch[1].poster : null),
          cover:
            awResult.cover ||
            (auMatch ? auMatch[1].cover : null) ||
            (hsMatch ? hsMatch[1].cover : null),
        },
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

      let auMatch: [number, any] | null = null
      for (let k = 0; k < unityResults.length; k++) {
        if (usedUnity.has(k)) continue
        const auResult = unityResults[k]

        const normalizedAS = normalizeTitle(asResult.title)
        const normalizedAU = normalizeTitle(auResult.title)

        if (hasSignificantDifference(normalizedAS, normalizedAU)) {
          continue
        }

        const similarity = stringSimilarity(normalizedAS, normalizedAU)

        if (similarity >= 0.8) {
          auMatch = [k, auResult]
          break
        }
      }

      let hsMatch: [number, any] | null = null
      for (let l = 0; l < heavenResults.length; l++) {
        if (usedHeaven.has(l)) continue
        const hsResult = heavenResults[l]

        const normalizedAS = normalizeTitle(asResult.title)
        const normalizedHS = normalizeTitle(hsResult.title)

        if (hasSignificantDifference(normalizedAS, normalizedHS)) {
          continue
        }

        const similarity = stringSimilarity(normalizedAS, normalizedHS)

        if (similarity >= 0.8) {
          hsMatch = [l, hsResult]
          break
        }
      }

      if (auMatch) {
        const [k, auResult] = auMatch
        usedUnity.add(k)
        sources.push({ name: "Unity", url: auResult.url, id: auResult.id })
      }

      if (hsMatch) {
        const [l, hsResult] = hsMatch
        usedHeaven.add(l)
        sources.push({ name: "Heaven", url: hsResult.url, id: hsResult.id })
      }

      unifiedResults.push({
        title: asResult.title,
        description: asResult.description,
        images: {
          poster:
            asResult.poster ||
            (auMatch ? auMatch[1].poster : null) ||
            (hsMatch ? hsMatch[1].poster : null),
          cover:
            asResult.cover ||
            (auMatch ? auMatch[1].cover : null) ||
            (hsMatch ? hsMatch[1].cover : null),
        },
        sources,
        has_multi_servers: sources.length > 1,
      })
    }
  }

  // Add remaining unmatched Unity results
  for (let i = 0; i < unityResults.length; i++) {
    if (!usedUnity.has(i)) {
      const auResult = unityResults[i]
      const sources = [{ name: "Unity", url: auResult.url, id: auResult.id }]

      let hsMatch: [number, any] | null = null
      for (let l = 0; l < heavenResults.length; l++) {
        if (usedHeaven.has(l)) continue
        const hsResult = heavenResults[l]

        const normalizedAU = normalizeTitle(auResult.title)
        const normalizedHS = normalizeTitle(hsResult.title)

        if (hasSignificantDifference(normalizedAU, normalizedHS)) {
          continue
        }

        const similarity = stringSimilarity(normalizedAU, normalizedHS)

        if (similarity >= 0.8) {
          hsMatch = [l, hsResult]
          break
        }
      }

      if (hsMatch) {
        const [l, hsResult] = hsMatch
        usedHeaven.add(l)
        sources.push({ name: "Heaven", url: hsResult.url, id: hsResult.id })
      }

      unifiedResults.push({
        title: auResult.title,
        description: auResult.description,
        images: {
          poster: auResult.poster || (hsMatch ? hsMatch[1].poster : null),
          cover: auResult.cover || (hsMatch ? hsMatch[1].cover : null),
        },
        sources,
        has_multi_servers: sources.length > 1,
      })
    }
  }

  // Add remaining unmatched Heaven results
  for (let i = 0; i < heavenResults.length; i++) {
    if (!usedHeaven.has(i)) {
      const hsResult = heavenResults[i]

      unifiedResults.push({
        title: hsResult.title,
        description: hsResult.description,
        images: { poster: hsResult.poster, cover: hsResult.cover },
        sources: [{ name: "Heaven", url: hsResult.url, id: hsResult.id }],
        has_multi_servers: false,
      })
    }
  }

  return unifiedResults
}
