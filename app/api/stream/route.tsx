import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper, AnimePaheScraper, UnityScraper } from "@/lib/scrapers"
import type { StreamResult } from "@/lib/models"
import { getQueryParams } from "@/lib/query-utils"

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

  const searchParams = getQueryParams(request)
  const AW = searchParams.get("AW")
  const AS = searchParams.get("AS")
  const AP = searchParams.get("AP")
  const AP_ANIME = searchParams.get("AP_ANIME")
  const AU = searchParams.get("AU")
  const res = searchParams.get("res")

  console.log(
    `[v0] Stream endpoint called with AW: ${AW}, AS: ${AS}, AP: ${AP}, AP_ANIME: ${AP_ANIME}, AU: ${AU}, res: ${res}`,
  )

  if (!AW && !AS && !AP && !AU) {
    return NextResponse.json(
      { error: "At least one episode ID (AW, AS, AP, or AU) must be provided" },
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
    const taskSources: string[] = []
    const animeworldScraper = new AnimeWorldScraper()
    const animesaturnScraper = new AnimeSaturnScraper()
    const animepaheScraper = new AnimePaheScraper()
    const unityScraper = new UnityScraper()

    if (AW) {
      console.log(`[v0] Adding AnimeWorld stream task for ID: ${AW}`)
      tasks.push(animeworldScraper.getStreamUrl(AW))
      taskSources.push("AnimeWorld")
    }
    if (AS) {
      console.log(`[v0] Adding AnimeSaturn stream task for ID: ${AS}`)
      tasks.push(animesaturnScraper.getStreamUrl(AS))
      taskSources.push("AnimeSaturn")
    }
    if (AP && AP_ANIME && res) {
      console.log(`[v0] Adding AnimePahe stream task for episode: ${AP}, anime: ${AP_ANIME}, resolution: ${res}`)
      tasks.push(animepaheScraper.getStreamUrl(AP, AP_ANIME, res))
      taskSources.push("AnimePahe")
    }
    if (AU) {
      console.log(`[v0] Adding Unity stream task for ID: ${AU}`)
      tasks.push(unityScraper.getStreamUrl(AU))
      taskSources.push("Unity")
    }

    console.log(`[v0] Running ${tasks.length} stream scraping tasks`)
    const results = await Promise.allSettled(tasks)
    console.log(`[v0] Stream results:`, results)

    const streamResult: StreamResult & {
      AnimePahe?: { available: boolean; stream_url?: string; embed?: string; provider?: string }
      Unity?: { available: boolean; stream_url?: string; embed?: string; provider?: string }
    } = {
      AnimeWorld: { available: false, stream_url: undefined, embed: undefined },
      AnimeSaturn: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
      AnimePahe: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
      Unity: { available: false, stream_url: undefined, embed: undefined, provider: undefined },
    }

    for (let i = 0; i < results.length; i++) {
      const source = taskSources[i]
      const result = results[i]

      if (result.status === "fulfilled" && result.value) {
        const data = result.value
        console.log(`[v0] ${source} stream result:`, data)

        if (source === "AnimeWorld") {
          const url = typeof data === "string" ? data : data.stream_url
          streamResult.AnimeWorld = {
            available: true,
            stream_url: url,
            embed: url
              ? `<iframe src="${url}" width="560" height="315" scrolling="no" frameborder="0" allowfullscreen></iframe>`
              : undefined,
          }
        } else if (source === "AnimeSaturn") {
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
        } else if (source === "AnimePahe") {
          const url = typeof data === "string" ? data : data.stream_url
          const provider = typeof data === "object" ? data.provider : undefined

          if (url) {
            const embedUrl = `https://animesaturn-proxy.onrender.com/embed?url=${encodeURIComponent(url)}`
            const embedHtml = `<video 
    src="${embedUrl}" 
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
        } else if (source === "Unity") {
          const url = typeof data === "string" ? data : data.stream_url
          const embedHtml = typeof data === "object" ? data.embed : undefined
          const provider = typeof data === "object" ? data.provider : undefined

          streamResult.Unity = {
            available: true,
            stream_url: url,
            embed:
              embedHtml ||
              `<video 
    src="${url}" 
    class="w-full h-full" 
    controls 
    playsinline 
    preload="metadata" 
    autoplay>
</video>`,
            provider: provider || "Unity",
          }
        }
      } else if (result.status === "rejected") {
        console.log(`[v0] ${source} stream failed:`, result.reason)
      }
    }

    console.log(`[v0] Final stream result:`, streamResult)
    return NextResponse.json(streamResult, { headers })
  } catch (error) {
    console.log(`[v0] Exception in stream endpoint: ${error}`)
    return NextResponse.json({ error: `Failed to get stream URLs: ${error}` }, { status: 500, headers })
  }
}
