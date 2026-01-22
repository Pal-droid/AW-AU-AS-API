import { NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, AnimePaheScraper, UnityScraper } from "@/lib/scrapers"
import { detectDuplicates } from "@/lib/utils-anime"
import { getQueryParams } from "@/lib/query-utils"

export async function GET(request: Request) {
  try {
    console.log("[v1] Search endpoint called")

    const searchParams = getQueryParams(request)
    const query = searchParams.get("q")

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

    const totalStartTime = Date.now()

    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const animepaheScraper = new AnimePaheScraper()
    const unityScraper = new UnityScraper()

    // Track individual scraper timings
    const awStartTime = Date.now()
    const asStartTime = Date.now()
    const apStartTime = Date.now()
    const auStartTime = Date.now()

    const [animeworldResults, animesaturnResults, animepaheResults, unityResults] = await Promise.allSettled([
      animeworldScraper.search(query).finally(() => {
        console.log(`[TIMING] [AnimeWorld] [${Date.now() - awStartTime}ms]`)
      }),
      animesaturnScraper.search(query).finally(() => {
        console.log(`[TIMING] [AnimeSaturn] [${Date.now() - asStartTime}ms]`)
      }),
      animepaheScraper.search(query).finally(() => {
        console.log(`[TIMING] [AnimePahe] [${Date.now() - apStartTime}ms]`)
      }),
      unityScraper.search(query).finally(() => {
        console.log(`[TIMING] [Unity] [${Date.now() - auStartTime}ms]`)
      }),
    ])

    const scrapersEndTime = Date.now()
    console.log(`[TIMING] [AllScrapers] [${scrapersEndTime - totalStartTime}ms]`)

    const awResults = animeworldResults.status === "fulfilled" ? animeworldResults.value : []
    const asResults = animesaturnResults.status === "fulfilled" ? animesaturnResults.value : []
    const apResults = animepaheResults.status === "fulfilled" ? animepaheResults.value : []
    const auResults = unityResults.status === "fulfilled" ? unityResults.value : []

    // Log errors if any scraper failed
    if (animeworldResults.status === "rejected") {
      console.log(`[ERROR] [AnimeWorld] [${animeworldResults.reason}]`)
    }
    if (animesaturnResults.status === "rejected") {
      console.log(`[ERROR] [AnimeSaturn] [${animesaturnResults.reason}]`)
    }
    if (animepaheResults.status === "rejected") {
      console.log(`[ERROR] [AnimePahe] [${animepaheResults.reason}]`)
    }
    if (unityResults.status === "rejected") {
      console.log(`[ERROR] [Unity] [${unityResults.reason}]`)
    }

    console.log(
      `[RESULTS] [Counts] [AW: ${awResults.length}, AS: ${asResults.length}, AP: ${apResults.length}, AU: ${auResults.length}]`,
    )

    const dedupeStartTime = Date.now()
    const unifiedResults = await detectDuplicates(awResults, asResults, apResults, auResults)
    console.log(`[TIMING] [DuplicateDetection] [${Date.now() - dedupeStartTime}ms]`)

    console.log(`[RESULTS] [Unified] [${unifiedResults.length} items]`)
    console.log(`[TIMING] [TotalRequest] [${Date.now() - totalStartTime}ms]`)

    return NextResponse.json(unifiedResults, {
      status: 200,
      headers: {
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
