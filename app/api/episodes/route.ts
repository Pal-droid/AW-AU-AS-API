import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, UnityScraper } from "@/lib/scrapers"
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

  console.log(`[v0] Episodes endpoint called with AW: ${AW}, AS: ${AS}, AU: ${AU}`)

  if (!AW && !AS && !AU) {
    console.log("[v0] No IDs provided, returning error")
    return NextResponse.json(
      { error: "At least one source ID (AW, AS, or AU) must be provided" },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const unityScraper = new UnityScraper()

    if (AW) tasks.push(animeworldScraper.getEpisodes(AW))
    if (AS) tasks.push(animesaturnScraper.getEpisodes(AS))
    if (AU) tasks.push(unityScraper.getEpisodes(AU))

    const results = await Promise.allSettled(tasks)

    const allEpisodes: Record<number, EpisodeResult> = {}

    let taskIndex = 0

    if (AW && results[taskIndex]?.status === "fulfilled") {
      for (const ep of results[taskIndex].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["AnimeWorld"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
      taskIndex++
    } else if (AW) {
      taskIndex++
    }

    if (AS && results[taskIndex]?.status === "fulfilled") {
      for (const ep of results[taskIndex].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["AnimeSaturn"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
      taskIndex++
    } else if (AS) {
      taskIndex++
    }

    if (AU && results[taskIndex]?.status === "fulfilled") {
      for (const ep of results[taskIndex].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["Unity"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
    }

    for (const epData of Object.values(allEpisodes)) {
      for (const source of ["AnimeWorld", "AnimeSaturn", "Unity"]) {
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
