import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseStreamCandidates } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'path' mancante. Esempio: /play/horimiya.Mse3-/lRRhWd" },
        { status: 400 },
      )
    }
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`

    const { html, finalUrl } = await fetchHtml(url)
    const candidates = parseStreamCandidates(html)

    return NextResponse.json({
      ok: true,
      source: finalUrl,
      htmlLength: html.length,
      candidates,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore debug scrape" }, { status: 500 })
  }
}
