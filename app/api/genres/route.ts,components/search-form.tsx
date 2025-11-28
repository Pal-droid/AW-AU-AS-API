"use client"

// app/api/genres/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { fetchHtml } from "@/lib/fetch-html"
import { load } from "cheerio"
import { ANIMEWORLD_BASE } from "@/lib/constants"
import { GENRE_BY_SLUG, GENRE_BY_NAME } from "@/lib/genre-map"

export async function GET(_req: NextRequest) {
  try {
    const url = `${ANIMEWORLD_BASE}/genre`
    const { html, finalUrl } = await fetchHtml(url)
    const $ = load(html)
    const out: Array<{ name: string; slug: string; href: string; count?: number; tooltip?: string; id?: number }> = []

    $("ul.generi-belli li").each((_, li) => {
      const a = $(li).find("a").first()
      const name = a.find("span").text().trim()
      const href = a.attr("href") || ""
      const slug = href.split("/").pop() || name.toLowerCase().replace(/\s+/g, "-")
      const countStr = a.find("i").text().trim()
      const count = countStr ? Number(countStr.replace(/\D+/g, "")) : undefined
      const tooltip = $(li).find(".info.tip").attr("data-tippy-content") || undefined

      const idFromSlug = GENRE_BY_SLUG[slug?.toLowerCase()]?.id
      const idFromName = GENRE_BY_NAME[name?.toLowerCase()]?.id
      const id = idFromSlug || idFromName

      if (name && href) {
        out.push({ name, slug, href, count, tooltip, id })
      }
    })

    if (out.length === 0) {
      const fallback = Object.values(GENRE_BY_SLUG).map((g: any) => ({
        name: g.name,
        slug: g.slug,
        href: `${ANIMEWORLD_BASE}/genre/${g.slug}`,
        id: g.id,
      }))
      return NextResponse.json({ ok: true, items: fallback, source: finalUrl, fallback: true })
    }

    return NextResponse.json({ ok: true, items: out, source: finalUrl })
  } catch (e: any) {
    const fallback = Object.values(GENRE_BY_SLUG).map((g: any) => ({
      name: g.name,
      slug: g.slug,
      href: `${ANIMEWORLD_BASE}/genre/${g.slug}`,
      id: g.id,
    }))
    return NextResponse.json({
      ok: true,
      items: fallback,
      error: e?.message || "Errore generi (fallback)",
      fallback: true,
    })
  }
}

// components/search-form.tsx
import { useEffect, useState } from "react"
import { GENRE_BY_SLUG, GENRE_BY_NAME } from "@/lib/genre-map"

const SearchForm = () => {
  const [genreList, setGenreList] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/genres", { cache: "force-cache" })
        const j = await r.json()
        if (j?.ok && Array.isArray(j.items) && j.items.length > 0) {
          const mapped = j.items.map((it: any) => {
            const id =
              it.id ??
              GENRE_BY_SLUG[String(it.slug || "").toLowerCase()]?.id ??
              GENRE_BY_NAME[String(it.name || "").toLowerCase()]?.id
            return {
              name: String(it.name || ""),
              slug: String(it.slug || ""),
              id,
              tooltip: it.tooltip,
              count: typeof it.count === "number" ? it.count : undefined,
            }
          })
          // Keep only entries with a resolved id so toggling works
          const filtered = mapped.filter((g: any) => typeof g.id === "number")
          if (filtered.length > 0) setGenreList(filtered)
        }
      } catch {
        // ignore, fallback stays
      }
    })()
  }, [])

  return <div>{/* Search form UI here */}</div>
}

export default SearchForm
