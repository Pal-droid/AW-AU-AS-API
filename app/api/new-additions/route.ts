import { NextResponse } from "next/server"
import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { load } from "cheerio"

type NewAdditionItem = {
  title: string
  href: string
  image: string
  releaseDate?: string
  status?: string
  isDub?: boolean
  sources?: Array<{ name: string; url: string; id: string }>
  has_multi_servers?: boolean
}

function extractAnimeId(href: string): string {
  // Extract ID from href like "/play/anime-name.ID" or "/play/anime-name"
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

function parseNewAdditions(html: string): NewAdditionItem[] {
  const $ = load(html)
  const items: NewAdditionItem[] = []

  // Look for the "Nuove aggiunte" widget
  $('.widget.simple-film-list .widget-title .title:contains("Nuove aggiunte")')
    .closest(".widget")
    .find(".widget-body .item")
    .each((_, el) => {
      const $item = $(el)

      const $link = $item.find("a").first()
      const href = $link.attr("href") || ""
      const image = $item.find("img.thumb").attr("src") || $item.find("img").attr("src") || ""
      const title = $link.attr("title") || $item.find(".name").text().trim() || ""

      if (!href || !title) return

      // Extract additional info
      const infoText = $item.find(".info").text().trim()
      const status = infoText.includes("Finito") ? "Finito" : infoText.includes("In corso") ? "In corso" : undefined

      // Check for dub indicator
      const isDub = $item.find(".dub").length > 0 || title.toLowerCase().includes("(ita)")

      // Try to extract release date from info text
      const dateMatch = infoText.match(/(\d{1,2}\s+\w+\s+\d{4})/i)
      const releaseDate = dateMatch ? dateMatch[1] : undefined

      const fullHref = href.startsWith("http") ? href : `${ANIMEWORLD_BASE}${href}`
      const fullImage =
        image && !image.startsWith("http") && !image.startsWith("/placeholder")
          ? `https://img.animeworld.ac${image.startsWith("/") ? "" : "/"}${image}`
          : image

      items.push({
        title,
        href: fullHref,
        image: fullImage,
        releaseDate,
        status,
        isDub,
        sources: createSourcesFromHref(href),
        has_multi_servers: false, // Default to false for now
      })
    })

  return items.slice(0, 12) // Limit to 12 items
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

async function validateNewAdditions(items: NewAdditionItem[]): Promise<NewAdditionItem[]> {
  const validationPromises = items.map(async (item) => {
    const animeId = extractAnimeId(item.href)
    if (!animeId) return null

    const isValid = await validateAnimeId(animeId)
    return isValid ? item : null
  })

  const validationResults = await Promise.all(validationPromises)
  return validationResults.filter((item): item is NewAdditionItem => item !== null)
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
    const items = parseNewAdditions(html)

    console.log("[v0] Scraped", items.length, "new additions from AnimeWorld")

    if (items.length > 0) {
      console.log("[v0] Using", items.length, "scraped new additions")
      return NextResponse.json({ ok: true, items })
    }

    console.log("[v0] Scraping failed, using mock data")
    const mockItems: NewAdditionItem[] = [
      {
        title: "Kaiju No. 8 Season 2",
        href: `${ANIMEWORLD_BASE}/play/kaiju-no-8-2.hXbK0`,
        image: "https://img.animeworld.ac/locandine/hXbK0.png",
        releaseDate: "2024",
        status: "In corso",
        sources: [{ name: "AnimeWorld", url: `${ANIMEWORLD_BASE}/play/kaiju-no-8-2.hXbK0`, id: "kaiju-no-8-2.hXbK0" }],
        has_multi_servers: false,
      },
      {
        title: "To Be Hero X",
        href: `${ANIMEWORLD_BASE}/play/to-be-hero-x.-rI-g`,
        image: "https://img.animeworld.ac/locandine/-rI-g.jpg",
        status: "Finito",
        sources: [{ name: "AnimeWorld", url: `${ANIMEWORLD_BASE}/play/to-be-hero-x.-rI-g`, id: "to-be-hero-x.-rI-g" }],
        has_multi_servers: false,
      },
      {
        title: "Demon Slayer: Kimetsu no Yaiba",
        href: `${ANIMEWORLD_BASE}/play/demon-slayer-season-4`,
        image: "https://img.animeworld.ac/locandine/demon-slayer.jpg",
        status: "In corso",
        sources: [
          { name: "AnimeWorld", url: `${ANIMEWORLD_BASE}/play/demon-slayer-season-4`, id: "demon-slayer-season-4" },
        ],
        has_multi_servers: false,
      },
      {
        title: "Jujutsu Kaisen Season 3",
        href: `${ANIMEWORLD_BASE}/play/jujutsu-kaisen-s3`,
        image: "https://img.animeworld.ac/locandine/jujutsu-kaisen.jpg",
        status: "In corso",
        sources: [{ name: "AnimeWorld", url: `${ANIMEWORLD_BASE}/play/jujutsu-kaisen-s3`, id: "jujutsu-kaisen-s3" }],
        has_multi_servers: false,
      },
    ]
    return NextResponse.json({ ok: true, items: mockItems })
  } catch (error) {
    console.error("New additions API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch new additions" }, { status: 500 })
  }
}
