import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, AnimePaheScraper } from "@/lib/scrapers"
import type { EpisodeResult } from "@/lib/models"

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
  const searchParams = request.nextUrl.searchParams
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")
  const AP = searchParams.get("AP")

  console.log(`[v0] Episodes endpoint called with AW: ${AW}, AS: ${AS}, AP: ${AP}`)

  if (!AW && !AS && !AP) {
    console.log("[v0] No IDs provided, returning error")
    return NextResponse.json(
      { error: "At least one source ID (AW, AS, or AP) must be provided" },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const animepaheScraper = new AnimePaheScraper()

    if (AW) tasks.push(animeworldScraper.getEpisodes(AW))
    if (AS) tasks.push(animesaturnScraper.getEpisodes(AS))
    if (AP) tasks.push(animepaheScraper.getEpisodes(AP))

    const results = await Promise.allSettled(tasks)

    const allEpisodes: Record<number, EpisodeResult> = {}

    if (AW && results[0].status === "fulfilled") {
      for (const ep of results[0].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["AnimeWorld"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
    }

    const asIndex = AW ? 1 : 0
    if (AS && results[asIndex]?.status === "fulfilled") {
      for (const ep of results[asIndex].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["AnimeSaturn"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
    }

    const apIndex = (AW ? 1 : 0) + (AS ? 1 : 0)
    if (AP && results[apIndex]?.status === "fulfilled") {
      for (const ep of results[apIndex].value) {
        const epNum = ep.episode_number
        if (!(epNum in allEpisodes)) allEpisodes[epNum] = { episode_number: epNum, sources: {} }
        allEpisodes[epNum].sources["AnimePahe"] = { available: true, url: ep.url || ep.stream_url, id: ep.id }
      }
    }

    for (const epData of Object.values(allEpisodes)) {
      for (const source of ["AnimeWorld", "AnimeSaturn", "AnimePahe"]) {
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
