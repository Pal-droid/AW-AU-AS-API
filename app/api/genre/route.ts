import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseSearch } from "@/lib/animeworld"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Parametro 'slug' mancante" }, { status: 400 })
    }
    const target = `${ANIMEWORLD_BASE}/genre/${encodeURIComponent(slug)}`
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
    const html = await res.text()
    const items = parseSearch(html)
    return NextResponse.json({ ok: true, items, source: target })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante la ricerca per genere" },
      { status: 500 },
    )
  }
}
