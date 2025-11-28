import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseEpisodes } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"
import { withCors } from "@/lib/cors"

function absolutize(href?: string) {
  if (!href) return ""
  if (href.startsWith("http")) return href
  if (!href.startsWith("/")) href = `/${href}`
  return `${ANIMEWORLD_BASE}${href}`
}

export const GET = withCors(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW")
    const asId = searchParams.get("AS")
    const apId = searchParams.get("AP")

    if (awId || asId || apId) {
      try {
        const params = new URLSearchParams()
        if (awId) params.set("AW", awId)
        if (asId) params.set("AS", asId.toLowerCase())
        if (apId) params.set("AP", apId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/episodes?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(20000),
        })

        if (unifiedRes.ok) {
          const unifiedData = await unifiedRes.json()

          if (Array.isArray(unifiedData) && unifiedData.length > 0) {
            const episodes = unifiedData
              .map((ep: any) => {
                const awSource = ep.sources?.AnimeWorld
                const asSource = ep.sources?.AnimeSaturn
                const apSource = ep.sources?.AnimePahe

                return {
                  num: ep.episode_number,
                  href: awSource?.url || asSource?.url || apSource?.url || "",
                  id: awSource?.id || asSource?.id || apSource?.id || "",
                  sources: {
                    AnimeWorld: awSource
                      ? {
                          available: !!awSource.url,
                          url: awSource.url,
                          id: awSource.id,
                        }
                      : { available: false },
                    AnimeSaturn: asSource
                      ? {
                          available: !!asSource.url,
                          url: asSource.url,
                          id: asSource.id,
                        }
                      : { available: false },
                    AnimePahe: { available: false },
                  },
                }
              })
              .filter((ep: any) => ep.href || ep.id)

            return NextResponse.json({
              ok: true,
              episodes,
              source: "https://aw-au-as-api.vercel.app/api/episodes",
              unified: true,
            })
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`Unified episodes API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("Unified episodes API failed:", unifiedError)
      }
    }

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro mancante. Usa AW=<id>, AS=<id>, AP=<id> oppure path=<path>" },
        { status: 400 },
      )
    }

    let cleanPath = path
    if (path.startsWith("/play/")) {
      cleanPath = path.replace(/\/+/g, "/")
    }

    const url = cleanPath.startsWith("http") ? cleanPath : `${ANIMEWORLD_BASE}${cleanPath}`
    console.log("[v0] Fetching episodes from URL:", url)

    const { html, finalUrl } = await fetchHtml(url)
    const raw = parseEpisodes(html) as Array<{ episode_num?: string; href?: string; data_id?: string }>
    const mapped = raw
      .map((e) => {
        const num = Number.parseInt(String(e.episode_num || "0"), 10) || 0
        const href = absolutize(e.href)
        const id = e.data_id
        if (!href || num <= 0) return null
        return { num, href, id }
      })
      .filter(Boolean) as Array<{ num: number; href: string; id?: string }>

    const byNum = new Map<number, { num: number; href: string; id?: string }>()
    for (const ep of mapped) {
      if (!byNum.has(ep.num)) byNum.set(ep.num, ep)
    }
    const episodes = Array.from(byNum.values()).sort((a, b) => a.num - b.num)

    if (episodes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessun episodio trovato nella pagina sorgente.", source: finalUrl },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, episodes, source: finalUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante il recupero episodi" }, { status: 500 })
  }
})
