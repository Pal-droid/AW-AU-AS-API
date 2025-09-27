import { type NextRequest, NextResponse } from "next/server";
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers";
import { detectDuplicates } from "@/lib/utils-anime";

export async function GET(request: NextRequest) {
  console.log("[v1] Search endpoint called, request object:", !!request);

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    console.log("[v1] Query too short, returning error");
    return NextResponse.json(
      { error: "Query must be at least 2 characters long" },
      { status: 400 }
    );
  }

  try {
    console.log("[v1] Starting concurrent scraping tasks");
    const animeworldScraper = new AnimeWorldScraper();
    const animesaturnScraper = new AnimeSaturnScraper();

    // Scrape from both sources concurrently
    const [animeworldResults, animesaturnResults] = await Promise.allSettled([
      animeworldScraper.search(query),
      animesaturnScraper.search(query),
    ]);

    const awResults =
      animeworldResults.status === "fulfilled" ? animeworldResults.value : [];
    const asResults =
      animesaturnResults.status === "fulfilled" ? animesaturnResults.value : [];

    console.log(`[v1] AW results count: ${awResults.length}, AS results count: ${asResults.length}`);

    // Combine and deduplicate results (async)
    const unifiedResults = await detectDuplicates(awResults, asResults);

    console.log(`[v1] Unified results count: ${unifiedResults.length}`);
    return NextResponse.json(unifiedResults);
  } catch (error) {
    console.error(`[v1] Exception in search endpoint: ${error}`);
    return NextResponse.json(
      { error: `Search failed: ${error}` },
      { status: 500 }
    );
  }
}