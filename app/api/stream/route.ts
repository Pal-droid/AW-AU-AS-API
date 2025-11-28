import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseStreamCandidates } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

function pickBest(candidates: string[]): string | null {
  if (!candidates.length) return null
  const mp4 = candidates.find((u) => u.toLowerCase().includes(".mp4"))
  if (mp4) return mp4
  try {
    const sweet = candidates.find((u) => {
      const h = new URL(u).hostname
      return h === "sweetpixel.org" || h.endsWith(".sweetpixel.org")
    })
    if (sweet) return sweet
  } catch {}
  const https = candidates.find((u) => u.startsWith("https://"))
  if (https) return https
  return candidates[0]
}

const ANIMESATURN_PROXY = "https://animesaturn-proxy.onrender.com/embed"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW")
    const asId = searchParams.get("AS")

    if (asId) {
      try {
        const params = new URLSearchParams()
        params.set("AS", asId.toLowerCase())

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(25000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()
          const animeSaturnData = streamData.AnimeSaturn

          if (animeSaturnData?.available && animeSaturnData.stream_url) {
            // Build the embed URL using the proxy
            const embedUrl = `${ANIMESATURN_PROXY}?url=${encodeURIComponent(animeSaturnData.stream_url)}`

            return NextResponse.json({
              ok: true,
              streamUrl: animeSaturnData.stream_url,
              embedUrl: embedUrl,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeSaturn",
              unified: true,
              isEmbed: true,
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "AnimeSaturn non disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`AnimeSaturn API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("AnimeSaturn stream API failed:", unifiedError)
        return NextResponse.json({ ok: false, error: "Errore nel recupero stream AnimeSaturn" }, { status: 500 })
      }
    }

    if (awId) {
      try {
        const params = new URLSearchParams()
        params.set("AW", awId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(25000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()
          const animeWorldData = streamData.AnimeWorld

          if (animeWorldData?.available && animeWorldData.stream_url) {
            return NextResponse.json({
              ok: true,
              streamUrl: animeWorldData.stream_url,
              embed: animeWorldData.embed,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeWorld",
              unified: true,
              isEmbed: false,
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "AnimeWorld non disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`Unified API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("Unified stream API failed, falling back to AnimeWorld:", unifiedError)
      }
    }

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro mancante. Usa AW=<id>, AS=<id> oppure path=<path>" },
        { status: 400 },
      )
    }

    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`

    const { html, finalUrl } = await fetchHtml(url)
    const candidates = parseStreamCandidates(html)
    const streamUrl = pickBest(candidates)

    if (!streamUrl) {
      return NextResponse.json(
        { ok: false, error: "Sorgenti video non trovate nella pagina.", source: finalUrl, candidates },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, streamUrl, source: finalUrl, candidates })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero del link stream" },
      { status: 500 },
    )
  }
}
