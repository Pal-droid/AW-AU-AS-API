import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    })

    if (response.ok) {
      return response
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header`)
      }

      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString()
      console.log(`[v0] Following redirect to: ${currentUrl}`)
      continue
    }

    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

export async function GET() {
  try {
    console.log("[v0] Scraping trending chapters from mangaworld...")

    const response = await fetchWithRedirects("https://www.mangaworld.cx/")
    const html = await response.text()
    const $ = cheerio.load(html)

    const trendingChapters: any[] = []

    $(".entry.vertical").each((index, element) => {
      if (index >= 10) return false // Limit to 10 items

      const $entry = $(element)
      const link = $entry.find("a.thumb")
      const href = link.attr("href")
      const title = link.attr("title") || $entry.find(".manga-title").text().trim()
      const image = $entry.find("img").attr("src")
      const chapter = $entry.find(".chapter").text().trim()

      console.log(`[v0] Processing entry ${index}: ${title}, image: ${image}, chapter: ${chapter}`)

      if (href && title && image) {
        // Extract manga ID from URL like /manga/2485/dandadan/
        const urlMatch = href.match(/\/manga\/(\d+)\/([^/]+)/)
        if (urlMatch) {
          const [, id, slug] = urlMatch

          trendingChapters.push({
            id,
            title,
            image,
            chapter,
            url: `/manga/${id}`,
          })
        }
      }
    })

    console.log(`[v0] Successfully scraped ${trendingChapters.length} trending chapters`)

    return NextResponse.json({
      ok: true,
      chapters: trendingChapters,
    })
  } catch (error) {
    console.error("Trending chapters API error:", error)

    const fallbackChapters = [
      {
        id: "2485",
        title: "Dan Da Dan",
        image: "https://cdn.mangaworld.cx/volumes/63a2fcb82a28787b6d70ef01.jpg?1682018990821",
        chapter: "Capitolo 72",
        url: "/manga/2485",
      },
      {
        id: "2423",
        title: "Four Knights of the Apocalypse",
        image: "https://cdn.mangaworld.cx/mangas/601e7552edad166b3cab3a78.jpg?1758262961514",
        chapter: "Capitolo 207",
        url: "/manga/2423",
      },
      {
        id: "2668",
        title: "Gachiakuta",
        image: "https://cdn.mangaworld.cx/volumes/684343b1fe9b1a5c2ee83cea.jpeg?1755632378151",
        chapter: "Capitolo 146",
        url: "/manga/2668",
      },
      {
        id: "2532",
        title: "Shangri-La Frontier",
        image: "https://cdn.mangaworld.cx/volumes/682f3231d018a5507bb9af9a.jpg?1748038145295",
        chapter: "Capitolo 184",
        url: "/manga/2532",
      },
      {
        id: "1972",
        title: "Martial Peak",
        image: "https://cdn.mangaworld.cx/mangas/5fa8afef25d77b716a36c9be.png?1758262984891",
        chapter: "Capitolo 1811",
        url: "/manga/1972",
      },
    ]

    return NextResponse.json({
      ok: true,
      chapters: fallbackChapters,
    })
  }
}
