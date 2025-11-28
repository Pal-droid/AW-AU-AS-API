import { NextResponse } from "next/server"
import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { load } from "cheerio"

type OngoingAnimeItem = {
  title: string
  href: string
  image: string
  currentEpisode: string
  totalEpisodes: string
  isDub?: boolean
  isONA?: boolean
  sources?: Array<{ name: string; url: string; id: string }>
}

function extractAnimeId(href: string): string {
  // Extract ID from href like "/play/anime-name.ID" or "https://www.animeworld.ac/play/anime-name.ID"
  const match = href.match(/\/play\/([^/]+)/)
  return match ? match[1] : ""
}

function createSourcesFromHref(href: string): Array<{ name: string; url: string; id: string }> {
  const id = extractAnimeId(href)
  if (!id) return []

  return [
    {
      name: "AnimeWorld",
      url: href.startsWith("http") ? href : `${ANIMEWORLD_BASE}${href}`,
      id: id,
    },
  ]
}

function parseOngoingAnime(html: string): OngoingAnimeItem[] {
  const $ = load(html)
  const items: OngoingAnimeItem[] = []

  // Look for the "Anime in corso" widget and select items from the owl-carousel
  const ongoingWidget = $('.widget .widget-title .title:contains("Anime in corso")').closest(".widget")

  // Select items directly from owl-carousel, not from owl-stage/owl-item (those are added by JS)
  ongoingWidget.find(".owl-carousel .item").each((_, el) => {
    const $item = $(el)
    const $inner = $item.find(".inner")

    // Get the poster link and image
    const $posterLink = $inner.find("a.poster")
    const href = $posterLink.attr("href") || ""
    const image = $posterLink.find("img").attr("src") || ""

    // Get the title from the name link
    const title = $inner.find("a.name").attr("title") || $inner.find("a.name").text().trim() || ""

    // Get episode information from the status div
    const episodeText = $inner.find(".status .ep").text().trim()
    const [currentEpisode, totalEpisodes] = episodeText.split("/")

    // Check for dub and ONA indicators
    const isDub = $inner.find(".status .dub").length > 0
    const isONA = $inner.find(".status .ona").length > 0

    if (!href || !title || !currentEpisode) return

    const fullHref = href.startsWith("http") ? href : `${ANIMEWORLD_BASE}${href}`
    const fullImage =
      image && !image.startsWith("http") && !image.startsWith("/placeholder")
        ? `https://img.animeworld.ac${image.startsWith("/") ? "" : "/"}${image}`
        : image

    items.push({
      title,
      href: fullHref,
      image: fullImage,
      currentEpisode: currentEpisode || "0",
      totalEpisodes: totalEpisodes || "??",
      isDub,
      isONA,
      sources: createSourcesFromHref(href),
    })
  })

  console.log("[v0] Found items in ongoing widget:", items.length)
  return items.slice(0, 20) // Limit to 20 items for performance
}

async function validateAnimeId(animeId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://aw-au-as-api.vercel.app/api/episodes?AW=${animeId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return false

    const episodes = await response.json()
    return Array.isArray(episodes) && episodes.length > 0
  } catch {
    return true
  }
}

async function validateOngoingAnime(items: OngoingAnimeItem[]): Promise<OngoingAnimeItem[]> {
  const validationPromises = items.map(async (item) => {
    const animeId = extractAnimeId(item.href)
    if (!animeId) return null

    const isValid = await validateAnimeId(animeId)
    return isValid ? item : null
  })

  const validationResults = await Promise.all(validationPromises)
  return validationResults.filter((item): item is OngoingAnimeItem => item !== null)
}

export async function GET() {
  try {
    const res = await fetch(ANIMEWORLD_BASE, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      // Revalidate every 30 minutes
      next: { revalidate: 1800 },
    })

    const html = await res.text()
    const items = parseOngoingAnime(html)

    console.log("[v0] Scraped", items.length, "ongoing anime from AnimeWorld")

    if (items.length > 0) {
      console.log("[v0] Using", items.length, "scraped ongoing anime")
      return NextResponse.json({ ok: true, items })
    }

    console.log("[v0] Scraping failed, using mock data")
    const mockItems: OngoingAnimeItem[] = [
      {
        title: "One Piece",
        href: `${ANIMEWORLD_BASE}/play/one-piece-subita.qzG-LE`,
        image: "https://img.animeworld.ac/locandine/one-piece-egghead-arc-key-visual-v0-gxm191p8fl2c1.jpg",
        currentEpisode: "1144",
        totalEpisodes: "??",
        sources: [
          {
            name: "AnimeWorld",
            url: `${ANIMEWORLD_BASE}/play/one-piece-subita.qzG-LE`,
            id: "one-piece-subita.qzG-LE",
          },
        ],
      },
      {
        title: "My Dress-Up Darling 2 (ITA)",
        href: `${ANIMEWORLD_BASE}/play/sono-bisque-doll-wa-koi-wo-suru-2-ita.orysO`,
        image: "https://img.animeworld.ac/locandine/orysO.jpg",
        currentEpisode: "9",
        totalEpisodes: "12",
        isDub: true,
        sources: [
          {
            name: "AnimeWorld",
            url: `${ANIMEWORLD_BASE}/play/sono-bisque-doll-wa-koi-wo-suru-2-ita.orysO`,
            id: "sono-bisque-doll-wa-koi-wo-suru-2-ita.orysO",
          },
        ],
      },
      {
        title: "Kaiju No. 8 2",
        href: `${ANIMEWORLD_BASE}/play/kaiju-no-8-2.hXbK0`,
        image: "https://img.animeworld.ac/locandine/hXbK0.png",
        currentEpisode: "10",
        totalEpisodes: "12",
        sources: [{ name: "AnimeWorld", url: `${ANIMEWORLD_BASE}/play/kaiju-no-8-2.hXbK0`, id: "kaiju-no-8-2.hXbK0" }],
      },
      {
        title: "Dan Da Dan 2 (ITA) (CR)",
        href: `${ANIMEWORLD_BASE}/play/dan-da-dan-2-ita-cr.qUGIs`,
        image: "https://img.animeworld.ac/locandine/IsJ2N.jpg",
        currentEpisode: "9",
        totalEpisodes: "12",
        isDub: true,
        sources: [
          {
            name: "AnimeWorld",
            url: `${ANIMEWORLD_BASE}/play/dan-da-dan-2-ita-cr.qUGIs`,
            id: "dan-da-dan-2-ita-cr.qUGIs",
          },
        ],
      },
    ]
    return NextResponse.json({ ok: true, items: mockItems })
  } catch (error) {
    console.error("Ongoing anime API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch ongoing anime" }, { status: 500 })
  }
}
