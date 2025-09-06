import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers"
import type { StreamResult } from "@/lib/models"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")

  if (!AW && !AS) {
    return NextResponse.json({ error: "At least one episode ID (AW or AS) must be provided" }, { status: 400 })
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()

    if (AW) {
      tasks.push(animeworldScraper.getStreamUrl(AW))
    }
    if (AS) {
      tasks.push(animesaturnScraper.getStreamUrl(AS))
    }

    const results = await Promise.allSettled(tasks)

    const streamResult: StreamResult = {
      AnimeWorld: { available: false, stream_url: undefined, embed: undefined },
      AnimeSaturn: { available: false, stream_url: undefined, embed: undefined },
    }

    // Process AnimeWorld result
    if (AW && results.length > 0 && results[0].status === "fulfilled" && results[0].value) {
      const url = typeof results[0].value === "string" ? results[0].value : results[0].value.stream_url
      streamResult.AnimeWorld = {
        available: true,
        stream_url: url,
        embed: url
          ? `<iframe src="${url}" width="560" height="315" scrolling="no" frameborder="0" allowfullscreen></iframe>`
          : undefined,
      }
    }

    if (AS && results.length > (AW ? 1 : 0) && results[AW ? 1 : 0].status === "fulfilled") {
      const resultIdx = AW ? 1 : 0
      const data = results[resultIdx].value
      if (data) {
        const url = typeof data === "string" ? data : data.stream_url
        const embedHtml = typeof data === "object" ? data.embed : undefined

        // Use the embed from AnimeSaturn scraper if available
        let finalEmbed = embedHtml
        if (!finalEmbed && url) {
          const proxyUrl = `https://animesaturn-proxy.onrender.com/proxy?url=${encodeURIComponent(url)}`
          finalEmbed = `<video 
    src="${proxyUrl}" 
    class="w-full h-full" 
    controls 
    playsinline 
    preload="metadata" 
    autoplay>
</video>`
        }

        streamResult.AnimeSaturn = {
          available: true,
          stream_url: url,
          embed: finalEmbed,
        }
      }
    }

    return NextResponse.json(streamResult)
  } catch (error) {
    return NextResponse.json({ error: `Failed to get stream URLs: ${error}` }, { status: 500 })
  }
}
