import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers"
import type { EpisodeResult } from "@/lib/models"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function GET(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  const searchParams = request.nextUrl.searchParams
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")

  console.log(`[v0] Episodes endpoint called with AW: ${AW}, AS: ${AS}`)

  if (!AW && !AS) {
    console.log("[v0] No IDs provided, returning error")
    return NextResponse.json({ error: "At least one source ID (AW or AS) must be provided" }, { status: 400, headers })
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()

    if (AW) {
      console.log(`[v0] Adding AnimeWorld task for ID: ${AW}`)
      tasks.push(animeworldScraper.getEpisodes(AW))
    }
    if (AS) {
      console.log(`[v0] Adding AnimeSaturn task for ID: ${AS}`)
      tasks.push(animesaturnScraper.getEpisodes(AS))
    }

    console.log(`[v0] Running ${tasks.length} episode scraping tasks`)
    const results = await Promise.allSettled(tasks)
    console.log(`[v0] Raw episode results:`, results)

    // Process results
    const allEpisodes: Record<number, EpisodeResult> = {}

    if (AW && results.length > 0 && results[0].status === "fulfilled") {
      console.log(`[v0] Processing AnimeWorld episodes:`, results[0].value)
      for (const ep of results[0].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) {
          allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        }
        allEpisodes[epNum].sources["AnimeWorld"] = {
          available: true,
          url: ep.url || ep.stream_url,
          id: ep.id,
        }
      }
    } else if (AW && results[0].status === "rejected") {
      console.log(`[v0] AnimeWorld episodes failed:`, results[0].reason)
    }

    if (AS && results.length > (AW ? 1 : 0) && results[AW ? 1 : 0].status === "fulfilled") {
      const resultIdx = AW ? 1 : 0
      console.log(`[v0] Processing AnimeSaturn episodes:`, results[resultIdx].value)

      // AnimeSaturn episodes are simpler - just a flat list
      for (const ep of results[resultIdx].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) {
          allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        }
        allEpisodes[epNum].sources["AnimeSaturn"] = {
          available: true,
          url: ep.url || ep.stream_url,
          id: ep.id,
        }
      }
    } else if (AS && results[AW ? 1 : 0].status === "rejected") {
      console.log(`[v0] AnimeSaturn episodes failed:`, results[AW ? 1 : 0].reason)
    }

    console.log(`[v0] All episodes before filling missing sources:`, allEpisodes)

    // Fill in missing sources as unavailable
    for (const epData of Object.values(allEpisodes)) {
      for (const source of ["AnimeWorld", "AnimeSaturn"]) {
        if (!(source in epData.sources)) {
          epData.sources[source] = {
            available: false,
            url: undefined,
            id: undefined,
          }
        }
      }
    }

    // Sort by episode number
    const sortedEpisodes = Object.values(allEpisodes).sort((a, b) => a.episode_number - b.episode_number)
    console.log(`[v0] Final sorted episodes:`, sortedEpisodes)
    console.log(`[v0] Final episodes count: ${sortedEpisodes.length}`)

    return NextResponse.json(sortedEpisodes, { headers })
  } catch (error) {
    console.log(`[v0] Exception in episodes endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get episodes: ${error}` }, { status: 500, headers })
  }
}
