import { NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, AnimePaheScraper } from "@/lib/scrapers"
import { detectDuplicates } from "@/lib/utils-anime"

export async function GET(request: Request) {
  try {
    console.log("[v1] Search endpoint called")
    console.log("[v1] Request type:", typeof request)
    console.log("[v1] Request URL:", request?.url)

    // Parse URL and get search params
    const url = new URL(request.url)
    const query = url.searchParams.get("q")

    console.log("[v1] Query parameter:", query)

    if (!query || query.trim().length < 2) {
      console.log("[v1] Query too short or missing")
      return NextResponse.json(
        {
          error: "Query parameter 'q' must be at least 2 characters long",
          usage: "Example: /api/search?q=naruto",
        },
        { status: 400 },
      )
    }

    console.log(`[v1] Starting search for: "${query}"`)

    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const animepaheScraper = new AnimePaheScraper()

    const [animeworldResults, animesaturnResults, animepaheResults] = await Promise.allSettled([
      animeworldScraper.search(query),
      animesaturnScraper.search(query),
      animepaheScraper.search(query),
    ])

    const awResults = animeworldResults.status === "fulfilled" ? animeworldResults.value : []
    const asResults = animesaturnResults.status === "fulfilled" ? animesaturnResults.value : []
    const apResults = animepaheResults.status === "fulfilled" ? animepaheResults.value : []

    console.log(`[v1] Results - AW: ${awResults.length}, AS: ${asResults.length}, AP: ${apResults.length}`)

    const unifiedResults = await detectDuplicates(awResults, asResults, apResults)

    console.log(`[v1] Unified results: ${unifiedResults.length}`)

    // -------------------------------
    // ADD BROWSER + CDN CACHING HERE
    // -------------------------------
    return NextResponse.json(unifiedResults, {
      status: 200,
      headers: {
        // Cache for 1 hour on CDN, 1 day stale-while-revalidate
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error(`[v1] Exception in search endpoint:`, error)
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
