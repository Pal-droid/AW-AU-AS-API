import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseLatestEpisodes } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const url = ANIMEWORLD_BASE
    const { html } = await fetchHtml(url)
    const episodes = parseLatestEpisodes(html)

    return NextResponse.json({ ok: true, episodes })
  } catch (e: any) {
    console.error("[v0] Error fetching latest episodes:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero degli ultimi episodi" },
      { status: 500 },
    )
  }
}
