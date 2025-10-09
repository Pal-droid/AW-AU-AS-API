import stringSimilarity from "string-similarity";
import translate from "@vitalets/google-translate-api"; // npm i @vitalets/google-translate-api
import { parseId, normalizeTitle } from "./utils"; // make sure these exist and are exported

/**
 * Async title/ID matcher with translation support
 */
export async function shouldMatch(
  awId: string,
  asId: string,
  awTitle?: string,
  asTitle?: string
): Promise<boolean> {
  try {
    const awParsed = parseId(awId);
    const asParsed = parseId(asId);

    if (awParsed.base === asParsed.base) {
      if (awParsed.season === asParsed.season && awParsed.lang === asParsed.lang) {
        console.log(`[v1] Exact ID match: ${awId} <-> ${asId}`);
        return true;
      }

      // Same base but different season/lang → compare translated titles
      if (awTitle && asTitle) {
        const normalizedAS = normalizeTitle(asTitle);
        const translation = await translate(awTitle, { to: "en" });
        const normalizedAWTranslated = normalizeTitle(translation.text);

        const similarity = stringSimilarity.compareTwoStrings(
          normalizedAWTranslated,
          normalizedAS
        );

        console.log(
          `[v1] Same base, translated title similarity: "${normalizedAWTranslated}" vs "${normalizedAS}" = ${similarity}`
        );

        return similarity >= 0.6; // lower threshold for same-base comparison
      }
    }
  } catch (error) {
    console.log(`[v1] ID parsing failed: ${error}`);
  }

  // Fallback: compare titles directly
  if (awTitle && asTitle) {
    const normalizedAW = normalizeTitle(awTitle);
    const normalizedAS = normalizeTitle(asTitle);
    const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS);
    console.log(`[v1] Title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`);
    return similarity >= 0.75;
  }

  return false;
}

/**
 * Async duplicate detection and merging for AnimeWorld + AnimeSaturn results
 */
export async function detectDuplicates(
  animeworldResults: any[],
  animesaturnResults: any[]
): Promise<any[]> {
  const unifiedResults: any[] = [];
  const usedAnimesaturn = new Set<number>();

  for (const awResult of animeworldResults) {
    const sources = [{ name: "AnimeWorld", url: awResult.url, id: awResult.id }];
    let bestMatch: [number, any] | null = null;

    for (let i = 0; i < animesaturnResults.length; i++) {
      if (usedAnimesaturn.has(i)) continue;
      const asResult = animesaturnResults[i];

      if (await shouldMatch(awResult.id, asResult.id, awResult.title, asResult.title)) {
        bestMatch = [i, asResult];
        break;
      }
    }

    if (bestMatch) {
      const [i, asResult] = bestMatch;
      usedAnimesaturn.add(i);
      sources.push({ name: "AnimeSaturn", url: asResult.url, id: asResult.id });

      unifiedResults.push({
        title: awResult.title,
        description: asResult.description || awResult.description,
        images: {
          poster: asResult.poster || awResult.poster,
          cover: asResult.cover || awResult.cover,
        },
        sources,
        has_multi_servers: sources.length > 1,
      });
    } else {
      unifiedResults.push({
        title: awResult.title,
        description: awResult.description,
        images: { poster: awResult.poster, cover: awResult.cover },
        sources,
        has_multi_servers: sources.length > 1,
      });
    }
  }

  // Add remaining unmatched AnimeSaturn results
  for (let i = 0; i < animesaturnResults.length; i++) {
    if (!usedAnimesaturn.has(i)) {
      const asResult = animesaturnResults[i];
      unifiedResults.push({
        title: asResult.title,
        description: asResult.description,
        images: { poster: asResult.poster, cover: asResult.cover },
        sources: [{ name: "AnimeSaturn", url: asResult.url, id: asResult.id }],
        has_multi_servers: false,
      });
    }
  }

  return unifiedResults;
}
