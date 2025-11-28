import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseWatchMeta, parseAnimeSaturnMeta } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"
import { load } from "cheerio"

// Parse next episode countdown (same as before)
function parseNextEpisodeCountdown(html: string): { nextEpisodeDate?: string; nextEpisodeTime?: string } {
  const $ = load(html)
  const countdownElement = $("#next-episode")
  if (countdownElement.length > 0) {
    const date = countdownElement.attr("data-calendar-date")
    const time = countdownElement.attr("data-calendar-time")
    if (date && time) return { nextEpisodeDate: date, nextEpisodeTime: time }
  }
  return {}
}

// Parse related anime from AnimeSaturn page
function parseAnimeSaturnRelated(html: string) {
  const $ = load(html)
  const related: { title: string; url: string; image: string }[] = []

  $(".owl-item.anime-card-newanime.main-anime-card").each((_, el) => {
    const card = $(el).find(".card > a").first()
    const url = card.attr("href")
    const image = card.find("img").attr("src")
    const title = card.attr("title") || $(el).find(".anime-card-newanime-overlay span").text().trim()

    if (url && title && image) related.push({ title, url, image })
  })

  return related
}

// Wrap the existing AnimeSaturn parser to include related anime
function parseAnimeSaturnMetaWithRelated(html: string) {
  const meta = parseAnimeSaturnMeta(html) || {}
  meta.related = parseAnimeSaturnRelated(html)
  return meta
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })

    let url: string
    if (path.startsWith("http")) {
      url = path
    } else if (path.includes("animesaturn") || path.startsWith("/anime/")) {
      url = path.startsWith("http") ? path : `https://www.animesaturn.cx${path}`
    } else {
      let animePath = path.replace(/\/+/g, "/")
      if (animePath.includes("/play/")) {
        const playMatch = animePath.match(/\/play\/([^/?]+)/)
        if (playMatch) animePath = `/play/${playMatch[1]}`
      } else if (!animePath.startsWith("/")) {
        animePath = `/play/${animePath}`
      } else if (!animePath.startsWith("/play/") && !animePath.includes(".")) {
        animePath = `/play/${animePath.replace(/^\/+/, "")}`
      }
      url = `${ANIMEWORLD_BASE}${animePath}`.replace(/([^:]\/)\/+/g, "$1")
    }

    const { html, finalUrl } = await fetchHtml(url)

    let meta
    if (finalUrl.includes("animesaturn.cx") || url.includes("animesaturn.cx")) {
      meta = parseAnimeSaturnMetaWithRelated(html)
    } else {
      meta = parseWatchMeta(html)
    }

    const countdownData = parseNextEpisodeCountdown(html)
    if (!meta) return NextResponse.json({ ok: false, error: "Meta non trovati", source: finalUrl }, { status: 404 })

    return NextResponse.json({
      ok: true,
      meta: { ...meta, ...countdownData },
      source: finalUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore meta" }, { status: 500 })
  }
}
