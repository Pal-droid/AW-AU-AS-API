import { type NextRequest, NextResponse } from "next/server"
import { load } from "cheerio"
import { fetchHtml } from "@/lib/fetch-html"
import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { GENRE_BY_SLUG, GENRE_BY_NAME } from "@/lib/genre-map"

type GenreOut = {
  name: string
  slug: string
  href: string
  count?: number
  tooltip?: string
  id?: number
}

function fallbackGenres(): GenreOut[] {
  return Object.values(GENRE_BY_SLUG).map((g: any) => ({
    name: g.name,
    slug: g.slug,
    href: `${ANIMEWORLD_BASE}/genre/${g.slug}`,
    id: g.id,
  }))
}

export async function GET(_req: NextRequest) {
  try {
    const url = `${ANIMEWORLD_BASE}/genre`
    const { html, finalUrl } = await fetchHtml(url)
    const $ = load(html)

    const items: GenreOut[] = []
    $("ul.generi-belli li").each((_, li) => {
      const $li = $(li)
      const a = $li.find("a").first()

      const rawName = a.find("span").text().trim() || String(a.attr("title") || "").trim() || a.text().trim()

      const href = a.attr("href") || ""
      const slug = (href.split("/").filter(Boolean).pop() as string) || rawName.toLowerCase().replace(/\s+/g, "-")

      const countStr = a.find("i").text().trim()
      const count = countStr ? Number(countStr.replace(/\D+/g, "")) : undefined
      const tooltip = $li.find(".info.tip").attr("data-tippy-content") || undefined

      const idFromSlug = GENRE_BY_SLUG[slug?.toLowerCase()]?.id
      const idFromName = GENRE_BY_NAME[rawName?.toLowerCase()]?.id
      const id = idFromSlug || idFromName

      if (rawName && href) {
        items.push({
          name: rawName,
          slug,
          href,
          count,
          tooltip,
          id,
        })
      }
    })

    if (items.length === 0) {
      // Page changed or empty — return a safe fallback so the UI still works
      return NextResponse.json({
        ok: true,
        items: fallbackGenres(),
        source: finalUrl,
        fallback: true,
      })
    }

    return NextResponse.json({ ok: true, items, source: finalUrl })
  } catch (e: any) {
    // Network or parsing error — serve fallback mapping
    return NextResponse.json({
      ok: true,
      items: fallbackGenres(),
      error: e?.message || "Errore generi (fallback)",
      fallback: true,
    })
  }
}
