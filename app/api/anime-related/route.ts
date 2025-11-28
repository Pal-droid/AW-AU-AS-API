import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseRelated } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })
    }

    let url: string
    if (path.startsWith("http")) {
      // If it's a full URL, use it directly
      url = path
    } else {
      // Otherwise, prepend AnimeWorld base
      const cleanPath = path.startsWith("/") ? path : `/${path}`
      url = `${ANIMEWORLD_BASE}${cleanPath}`
    }

    console.log("[v0] anime-related fetching URL:", url)

    const { html, finalUrl } = await fetchHtml(url)
    const items = parseRelated(html)

    console.log("[v0] anime-related parsed items:", items.length)

    const itemsWithSources = items.map((item) => {
      // Extract anime ID from href (e.g., "blue-lock-ita.ijvjF" from "/play/blue-lock-ita.ijvjF" or full URL)
      let animeId = ""
      try {
        const hrefPath = item.href.includes("://") ? new URL(item.href).pathname : item.href
        const match = hrefPath.match(/\/play\/([^/?#]+)/)
        if (match) {
          animeId = match[1]
        }
      } catch {
        const match = item.href.match(/\/play\/([^/?#]+)/)
        if (match) {
          animeId = match[1]
        }
      }

      const sources = animeId
        ? [
            {
              name: "AnimeWorld",
              url: `${ANIMEWORLD_BASE}/play/${animeId}`,
              id: animeId,
            },
          ]
        : []

      console.log("[v0] Related item:", item.title, "animeId:", animeId)

      return {
        ...item,
        sources,
        has_multi_servers: false,
      }
    })

    return NextResponse.json({ ok: true, items: itemsWithSources, source: finalUrl })
  } catch (e: any) {
    console.error("[v0] anime-related error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Errore related" }, { status: 500 })
  }
}
