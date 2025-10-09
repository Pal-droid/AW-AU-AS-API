import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, AnimePaheScraper } from "@/lib/scrapers"
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
  const AP = searchParams.get("AP")
  const AP_ANIME = searchParams.get("AP_ANIME")
  const res = searchParams.get("res")

  console.log(`[v0] Stream endpoint called with AW: ${AW}, AS: ${AS}, AP: ${AP}, AP_ANIME: ${AP_ANIME}, res: ${res}`)

  if (!AW && !AS && !AP) {
    return NextResponse.json(
      { error: "At least one episode ID (AW, AS, or AP) must be provided" },
      { status: 400, headers },
    )
  }

  if (AP && !AP_ANIME) {
    return NextResponse.json(
      { error: "AnimePahe requires both AP (episode session) and AP_ANIME (anime session)" },
      { status: 400, headers },
    )
  }

  if (AP && !res) {
    return NextResponse.json(
      { error: "Resolution parameter (res) is required for AnimePahe (e.g., ?res=1080)" },
      { status: 400, headers },
    )
  }

  try {
    const tasks: Promise<any>[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const animepaheScraper = new AnimePaheScraper()

    if (AW) {
      console.log(`[v0] Adding AnimeWorld stream task for ID: ${AW}`)
      tasks.push(animeworldScraper.getStreamUrl(AW))
    }
    if (AS) {
      console.log(`[v0] Adding AnimeSaturn stream task for ID: ${AS}`)
      tasks.push(animesaturnScraper.getStreamUrl(AS))
    }
    if (AP && AP_ANIME && res) {
      console.log(`[v0] Adding AnimePahe stream task for episode: ${AP}, anime: ${AP_ANIME}, resolution: ${res}`)
      tasks.push(animepaheScraper.getStreamUrl(AP, AP_ANIME, res))
    }

    console.log(`[v0] Running ${tasks.length} stream scraping tasks`)
    const results = await Promise.allSettled(tasks)
    console.log(`[v0] Stream results:`, results)

    const streamResult: StreamResult & {
      AnimePahe?: { available: boolean; stream_url?: string; embed?: string; provider?: string }
    } = {
      AnimeWorld: { available: false, stream_url: undefined, embed: undefined },
      AnimeSaturn: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
      AnimePahe: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
    }

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

    const asIndex = AW ? 1 : 0
    if (AS && results.length > asIndex && results[asIndex].status === "fulfilled") {
      const data = results[asIndex].value
      console.log(`[v0] AnimeSaturn stream result:`, data)

      if (data) {
        const url = typeof data === "string" ? data : data.stream_url
        const embedHtml = typeof data === "object" ? data.embed : undefined
        const provider = typeof data === "object" ? data.provider : undefined

        let finalEmbed = embedHtml
        if (!finalEmbed && url && url.includes(".m3u8")) {
          const proxyUrl = `https://animesaturn-proxy.onrender.com/proxy?url=${encodeURIComponent(url)}`
          finalEmbed = `<video 
    src="${proxyUrl}" 
    class="w-full h-full" 
    controls 
    playsinline 
    preload="metadata" 
    autoplay>
</video>`
        } else if (!finalEmbed && url) {
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
          provider: provider,
        }
      }
    } else if (AS && results[asIndex].status === "rejected") {
      console.log(`[v0] AnimeSaturn stream failed:`, results[asIndex].reason)
    }

    const apIndex = (AW ? 1 : 0) + (AS ? 1 : 0)
    if (AP && results.length > apIndex && results[apIndex].status === "fulfilled") {
      const data = results[apIndex].value
      console.log(`[v0] AnimePahe stream result:`, data)

      if (data) {
        const url = typeof data === "string" ? data : data.stream_url
        const provider = typeof data === "object" ? data.provider : undefined

        if (url) {
          const proxyUrl = `https://animesaturn-proxy.onrender.com/proxy?url=${encodeURIComponent(url)}`
          const embedHtml = `<video 
    src="${proxyUrl}" 
    class="w-full h-full" 
    controls 
    playsinline 
    preload="metadata" 
    autoplay>
</video>`

          streamResult.AnimePahe = {
            available: true,
            stream_url: url,
            embed: embedHtml,
            provider: provider || "AnimePahe",
          }
        }
      }
    } else if (AP && results[apIndex].status === "rejected") {
      console.log(`[v0] AnimePahe stream failed:`, results[apIndex].reason)
    }

    console.log(`[v0] Final stream result:`, streamResult)
    return NextResponse.json(streamResult, { headers })
  } catch (error) {
    console.log(`[v0] Exception in stream endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get stream URLs: ${error}` }, { status: 500, headers })
  }
}
