import { type NextRequest, NextResponse } from "next/server"
import { buildFilterUrl, parseSearch } from "@/lib/animeworld"
import { withCors } from "@/lib/cors"

function enhanceWithSources(items: any[]) {
  return items.map((item) => ({
    ...item,
    sources: [
      {
        name: "AnimeWorld",
        url: item.href.startsWith("http") ? item.href : `https://www.animeworld.ac${item.href}`,
        id: item.href.replace(/^.*\/play\//, "").replace(/\/$/, ""),
      },
    ],
    has_multi_servers: false,
  }))
}

export const GET = withCors(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)

    const keyword = searchParams.get("keyword")
    const hasFilters = Array.from(searchParams.entries()).some(([key, value]) => {
      if (key === "keyword") return false
      return value && value.trim() !== "" && value !== "any"
    })

    const hasAnyParams = Array.from(searchParams.entries()).length > 0

    if (!hasAnyParams) {
      console.log("[v0] No parameters provided, loading default recommendations from base filter URL")
      const target = "https://www.animeworld.ac/filter"

      const res = await fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          "Accept-Language": "it-IT,it;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://www.animeworld.ac/",
        },
        next: { revalidate: 300 },
      })

      console.log("[v0] Default recommendations response status:", res.status)

      const html = await res.text()
      const result = parseSearch(html)

      console.log("[v0] Default recommendations parsed items count:", result.items.length)

      const enhancedItems = enhanceWithSources(result.items)

      return NextResponse.json({ ok: true, items: enhancedItems, pagination: result.pagination, source: target })
    }

    // If only keyword and no filters, redirect to unified search
    if (keyword && !hasFilters) {
      console.log("[v0] Pure keyword search, redirecting to unified API")
      const unifiedUrl = new URL("/api/unified-search", req.url)
      unifiedUrl.searchParams.set("keyword", keyword)

      const response = await fetch(unifiedUrl.toString(), {
        headers: req.headers,
      })

      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }

    console.log("[v0] Using filter scraping for genre/filter search")

    // Preserve multiple values per key
    const multiParams = new Map<string, string[]>()
    for (const [k, v] of searchParams.entries()) {
      const arr = multiParams.get(k) || []
      arr.push(v)
      multiParams.set(k, arr)
    }

    // Build params allowing arrays
    const params: Record<string, string | string[]> = {}
    for (const [k, arr] of multiParams.entries()) {
      // Split comma-separated values but keep true duplicates as repeats
      const split = arr.flatMap((v) =>
        v
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      )
      params[k] = split
    }

    const target = buildFilterUrl(params)
    console.log("[v0] Genre filter URL constructed:", target)
    console.log("[v0] Filter params:", JSON.stringify(params))

    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.animeworld.ac/",
      },
      next: { revalidate: 300 },
    })

    console.log("[v0] Filter response status:", res.status)

    const html = await res.text()
    const result = parseSearch(html)

    console.log("[v0] Parsed items count:", result.items.length)
    console.log(
      "[v0] First few items:",
      result.items.slice(0, 3).map((item) => ({ title: item.title, href: item.href })),
    )

    const enhancedItems = enhanceWithSources(result.items)

    return NextResponse.json({ ok: true, items: enhancedItems, pagination: result.pagination, source: target })
  } catch (e: any) {
    console.error("[v0] Search API error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante la ricerca" }, { status: 500 })
  }
})
