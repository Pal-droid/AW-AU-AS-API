import { NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseTop } from "@/lib/animeworld"

type EnhancedTopItem = {
  rank: number
  title: string
  href: string
  image: string
  views?: string
  rating?: string
  sources?: Array<{ name: string; url: string; id: string }>
  has_multi_servers?: boolean
}

type EnhancedTopResponse = {
  day: EnhancedTopItem[]
  week: EnhancedTopItem[]
  month: EnhancedTopItem[]
}

function extractAnimeId(href: string): string {
  const match = href.match(/\/play\/([^/]+)/)
  return match ? match[1] : ""
}

function enhanceTopItems(items: any[]): EnhancedTopItem[] {
  return items.map((item) => ({
    ...item,
    sources: [
      {
        name: "AnimeWorld",
        url: item.href,
        id: extractAnimeId(item.href),
      },
    ],
    has_multi_servers: false,
  }))
}

export async function GET() {
  try {
    const res = await fetch(ANIMEWORLD_BASE, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      // Revalidate every 15 minutes
      next: { revalidate: 900 },
    })
    const html = await res.text()
    const data = parseTop(html)

    const enhancedData: EnhancedTopResponse = {
      day: enhanceTopItems(data.day),
      week: enhanceTopItems(data.week),
      month: enhanceTopItems(data.month),
    }

    return NextResponse.json({ ok: true, data: enhancedData })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante lo scraping Top" }, { status: 500 })
  }
}
