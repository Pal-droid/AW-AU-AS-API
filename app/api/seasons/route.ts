import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers"
import type { SeasonResult } from "@/lib/models"
import { getQueryParams } from "@/lib/query-utils"

export async function GET(request: NextRequest) {
  const searchParams = getQueryParams(request)
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")

  console.log(`[v0] Seasons endpoint called with AW: ${AW}, AS: ${AS}`)

  if (!AW && !AS) {
    console.log("[v0] No IDs provided, returning error")
    return NextResponse.json({ error: "At least one source ID (AW or AS) must be provided" }, { status: 400 })
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

    console.log(`[v0] Running ${tasks.length} season scraping tasks`)
    const results = await Promise.allSettled(tasks)
    console.log(`[v0] Raw season results:`, results)

    const seasonResult: SeasonResult = {
      AnimeWorld: [],
      AnimeSaturn: {},
    }

    // Process AnimeWorld result (flat list)
    if (AW && results.length > 0 && results[0].status === "fulfilled") {
      console.log(`[v0] Processing AnimeWorld seasons:`, results[0].value)
      for (const ep of results[0].value) {
        const episode = {
          episode_number: ep.episode_number,
          sources: {
            AnimeWorld: {
              available: true,
              url: ep.url || ep.stream_url,
              id: ep.id,
            },
            AnimeSaturn: {
              available: false,
              url: undefined,
              id: undefined,
            },
          },
        }
        seasonResult.AnimeWorld.push(episode)
      }
    }

    if (AS && results.length > (AW ? 1 : 0) && results[AW ? 1 : 0].status === "fulfilled") {
      const resultIdx = AW ? 1 : 0
      const asData = results[resultIdx].value
      console.log(`[v0] Processing AnimeSaturn seasons data:`, asData)
      console.log(`[v0] AnimeSaturn data type:`, typeof asData)

      // AnimeSaturn episodes are simpler - just put in S1
      console.log("[v0] AnimeSaturn data is flat list, organizing into S1")
      const seasonEpisodes = []
      for (const ep of asData) {
        const episode = {
          episode_number: ep.episode_number,
          sources: {
            AnimeWorld: {
              available: false,
              url: undefined,
              id: undefined,
            },
            AnimeSaturn: {
              available: true,
              url: ep.url || ep.stream_url,
              id: ep.id,
            },
          },
        }
        seasonEpisodes.push(episode)
      }
      seasonResult.AnimeSaturn["S1"] = seasonEpisodes
    }

    console.log(`[v0] Final season result:`, seasonResult)
    console.log(`[v0] AnimeWorld episodes count: ${seasonResult.AnimeWorld.length}`)
    console.log(`[v0] AnimeSaturn seasons:`, Object.keys(seasonResult.AnimeSaturn))

    return NextResponse.json(seasonResult)
  } catch (error) {
    console.log(`[v0] Exception in seasons endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get seasons: ${error}` }, { status: 500 })
  }
}
