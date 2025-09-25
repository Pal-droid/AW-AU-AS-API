import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers"
import type { StreamResult } from "@/lib/models"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,User-Agent",
    },
  })
}

export async function GET(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,User-Agent",
  }

  const searchParams = request.nextUrl.searchParams
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")

  console.log(`[v0] Stream endpoint called with AW: ${AW}, AS: ${AS}`)

  if (!AW && !AS) {
    return NextResponse.json({ error: "At least one episode ID (AW or AS) must be provided" }, { status: 400, headers })
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()

    if (AW) {
      console.log(`[v0] Adding AnimeWorld stream task for ID: ${AW}`)
      tasks.push(animeworldScraper.getStreamUrl(AW))
    }
    if (AS) {
      console.log(`[v0] Adding AnimeSaturn stream task for ID: ${AS}`)
      tasks.push(animesaturnScraper.getStreamUrl(AS))
    }

    console.log(`[v0] Running ${tasks.length} stream scraping tasks`)
    const results = await Promise.allSettled(tasks)
    console.log(`[v0] Stream results:`, results)

    const streamResult: StreamResult = {
      AnimeWorld: { available: false, stream_url: undefined, embed: undefined },
      AnimeSaturn: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
    }

    // Process AnimeWorld result
    if (AW && results.length > 0 && results[0].status === "fulfilled" && results[0].value) {
      console.log(`[v0] AnimeWorld stream result:`, results[0].value)
      const url = typeof results[0].value === "string" ? results[0].value : results[0].value.stream_url
      streamResult.AnimeWorld = {
        available: true,
        stream_url: url,
        embed: url
          ? `<iframe src="${url}" width="560" height="315" scrolling="no" frameborder="0" allowfullscreen></iframe>`
          : undefined,
      }
    } else if (AW && results[0].status === "rejected") {
      console.log(`[v0] AnimeWorld stream failed:`, results[0].reason)
    }

    if (AS && results.length > (AW ? 1 : 0) && results[AW ? 1 : 0].status === "fulfilled") {
      const resultIdx = AW ? 1 : 0
      const data = results[resultIdx].value
      console.log(`[v0] AnimeSaturn stream result:`, data)

      if (data) {
        const url = typeof data === "string" ? data : data.stream_url
        const embedHtml = typeof data === "object" ? data.embed : undefined
        const provider = typeof data === "object" ? data.provider : undefined

        let finalEmbed = embedHtml
        if (!finalEmbed && url && !url.includes(".m3u8")) {
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
          embed: finalEmbed, // This will be the proper JWPlayer embed for HLS or video tag for MP4
          provider: provider,
        }
      }
    } else if (AS && results[AW ? 1 : 0].status === "rejected") {
      console.log(`[v0] AnimeSaturn stream failed:`, results[AW ? 1 : 0].reason)
    }

    console.log(`[v0] Final stream result:`, streamResult)
    return NextResponse.json(streamResult, { headers })
  } catch (error) {
    console.log(`[v0] Exception in stream endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get stream URLs: ${error}` }, { status: 500, headers })
  }
}
