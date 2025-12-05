import { NextResponse } from "next/server"
import { ComixScraper, MangaWorldScraper, aggregateManga } from "@/lib/manga-scrapers"

export async function GET(request: Request) {
  try {
    console.log("[v0] Manga search endpoint called")

    const url = new URL(request.url)
    const query = url.searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          error: "Query parameter 'q' must be at least 2 characters long",
          usage: "Example: /api/manga/search?q=tonikaku",
        },
        { status: 400 },
      )
    }

    console.log(`[v0] Starting manga search for: "${query}"`)

    const comixScraper = new ComixScraper()
    const worldScraper = new MangaWorldScraper()

    const [comixResults, worldResults] = await Promise.allSettled([
      comixScraper.search(query),
      worldScraper.search(query),
    ])

    const cxResults = comixResults.status === "fulfilled" ? comixResults.value : []
    const mwResults = worldResults.status === "fulfilled" ? worldResults.value : []

    console.log(`[v0] Results - Comix: ${cxResults.length}, World: ${mwResults.length}`)

    const unifiedResults = aggregateManga([cxResults, mwResults])

    console.log(`[v0] Unified manga results: ${unifiedResults.length}`)

    return NextResponse.json(unifiedResults, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error(`[v0] Exception in manga search endpoint:`, error)
    return NextResponse.json(
      {
        error: "Manga search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
