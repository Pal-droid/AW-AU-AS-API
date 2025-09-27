import stringSimilarity from "string-similarity";
import translate from "@vitalets/google-translate-api"; // npm i @vitalets/google-translate-api

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

      // Same base but different season/lang
      if (awTitle && asTitle) {
        const normalizedAS = normalizeTitle(asTitle);

        // Translate AW title to English
        const translation = await translate(awTitle, { to: "en" });
        const normalizedAWTranslated = normalizeTitle(translation.text);

        const similarity = stringSimilarity.compareTwoStrings(
          normalizedAWTranslated,
          normalizedAS
        );

        console.log(
          `[v1] Same base, translated title similarity: "${normalizedAWTranslated}" vs "${normalizedAS}" = ${similarity}`
        );
        return similarity >= 0.6;
      }
    }
  } catch (error) {
    console.log(`[v1] ID parsing failed: ${error}`);
  }

  // Fallback to direct title similarity
  if (awTitle && asTitle) {
    const normalizedAW = normalizeTitle(awTitle);
    const normalizedAS = normalizeTitle(asTitle);
    const similarity = stringSimilarity.compareTwoStrings(normalizedAW, normalizedAS);
    console.log(`[v1] Title similarity: "${normalizedAW}" vs "${normalizedAS}" = ${similarity}`);
    return similarity >= 0.75;
  }

  return false;
}