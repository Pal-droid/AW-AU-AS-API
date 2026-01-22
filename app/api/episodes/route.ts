import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, UnityScraper, AnimeGGScraper } from "@/lib/scrapers"
import type { EpisodeResult } from "@/lib/models"
import { getQueryParams } from "@/lib/query-utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,User-Agent",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  const searchParams = getQueryParams(request)
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")
  const AU = searchParams.get("AU")
  const AG = searchParams.get("AG")

  console.log(`[v0] Episodes endpoint called with AW: ${AW}, AS: ${AS}, AU: ${AU}, AG: ${AG}`)

  if (!AW && !AS && !AU && !AG) {
    console.log("[v0] No IDs provided, returning error")
    return NextResponse.json(
      { error: "At least one source ID (AW, AS, AU, or AG) must be provided" },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  try {
    const tasks: Promise<any>[] = []
    const taskSources: string[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const unityScraper = new UnityScraper()
    const animeggScraper = new AnimeGGScraper()

    if (AW) {
      tasks.push(animeworldScraper.getEpisodes(AW))
      taskSources.push("AnimeWorld")
    }
    if (AS) {
      tasks.push(animesaturnScraper.getEpisodes(AS))
      taskSources.push("AnimeSaturn")
    }
    if (AU) {
      tasks.push(unityScraper.getEpisodes(AU))
      taskSources.push("Unity")
    }
    if (AG) {
      tasks.push(animeggScraper.getEpisodes(AG))
      taskSources.push("AnimeGG")
    }

    const results = await Promise.allSettled(tasks)

    const allEpisodes: Record<number, EpisodeResult> = {}

    for (let i = 0; i < results.length; i++) {
      const source = taskSources[i]
      const result = results[i]

      if (result.status === "fulfilled") {
        for (const ep of result.value) {
          const epNum = ep.episode_number
          if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
          allEpisodes[epNum].sources[source] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
        }
      } else {
        console.log(`[v0] ${source} episodes failed:`, result.reason)
      }
    }

    // Fill in missing sources for each episode
    const allSourceNames = ["AnimeWorld", "AnimeSaturn", "Unity", "AnimeGG"]
    for (const epData of Object.values(allEpisodes)) {
      for (const source of allSourceNames) {
        if (!(source in epData.sources)) epData.sources[source] = { available: false, url: undefined, id: undefined }
      }
    }

    const sortedEpisodes = Object.values(allEpisodes).sort((a, b) => a.episode_number - b.episode_number)
    return NextResponse.json(sortedEpisodes, { headers: CORS_HEADERS })
  } catch (error) {
    console.log(`[v0] Exception in episodes endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get episodes: ${error}` }, { status: 500, headers: CORS_HEADERS })
  }
}
