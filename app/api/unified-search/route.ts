import { type NextRequest, NextResponse } from "next/server"
import { buildFilterUrl, parseSearch } from "@/lib/animeworld"

type UnifiedSource = {
  name: string
  url: string
  id: string
}

type UnifiedResult = {
  title: string
  description?: string
  images: {
    poster?: string
    cover?: string
  }
  sources: UnifiedSource[]
  has_multi_servers: boolean
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get("keyword")

    if (!keyword) {
      return NextResponse.json({ ok: false, error: "Parametro 'keyword' mancante" }, { status: 400 })
    }

    // Check if ANY filters are applied - only use unified search for pure keyword searches
    const allParams = Array.from(searchParams.entries())
    const hasFilters = allParams.some(([key, value]) => {
      if (key === "keyword") return false
      // Only consider it a filter if it has a meaningful value
      return value && value.trim() !== "" && value !== "any"
    })

    console.log("Search params:", Object.fromEntries(searchParams.entries()))
    console.log("Has filters:", hasFilters)

    if (hasFilters) {
      console.log("Using regular search due to filters")
      // Fall back to regular search if filters are applied
      const params: Record<string, string | string[]> = {}
      for (const [k, v] of searchParams.entries()) {
        const existing = params[k]
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(v)
          } else {
            params[k] = [existing, v]
          }
        } else {
          params[k] = v
        }
      }

      const target = buildFilterUrl(params)
      const res = await fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        next: { revalidate: 300 },
      })
      const html = await res.text()
      const items = parseSearch(html)
      return NextResponse.json({ ok: true, items, source: target, unified: false })
    }

    // Try unified search for pure keyword searches
    console.log("Trying unified search for keyword:", keyword)
    try {
      const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/search?q=${encodeURIComponent(keyword)}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (unifiedRes.ok) {
        const unifiedData: UnifiedResult[] = await unifiedRes.json()
        console.log("Unified API response:", unifiedData.length, "results")

        // Transform unified results to our format
        const items = unifiedData.map((result) => {
          // Find AnimeWorld source first, fallback to first available
          const animeWorldSource = result.sources.find((s) => s.name === "AnimeWorld")
          const primaryUrl = animeWorldSource?.url || result.sources[0]?.url || ""

          console.log(
            "Result:",
            result.title,
            "has_multi_servers:",
            result.has_multi_servers,
            "sources:",
            result.sources.map((s) => s.name),
          )

          return {
            title: result.title,
            href: primaryUrl,
            image: result.images.poster || result.images.cover || "",
            isDub: false, // We don't have this info from unified API
            sources: result.sources,
            has_multi_servers: result.has_multi_servers,
            description: result.description, // Added description from new API
          }
        })

        console.log("Transformed items:", items.length)
        return NextResponse.json({
          ok: true,
          items,
          source: "https://aw-au-as-api.vercel.app/api/search",
          unified: true,
        })
      } else {
        console.log("Unified API failed with status:", unifiedRes.status)
      }
    } catch (unifiedError) {
      console.warn("Unified search failed, falling back to AnimeWorld:", unifiedError)
    }

    // Fallback to regular AnimeWorld search
    console.log("Using fallback AnimeWorld search")
    const target = `https://www.animeworld.ac/search?keyword=${encodeURIComponent(keyword)}`
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      next: { revalidate: 300 },
    })
    const html = await res.text()
    const items = parseSearch(html)
    return NextResponse.json({ ok: true, items, source: target, unified: false })
  } catch (e: any) {
    console.error("Search error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante la ricerca unificata" }, { status: 500 })
  }
}
