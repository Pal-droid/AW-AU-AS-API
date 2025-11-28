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
    console.log("[v0] Scraping latest manga chapters from mangaworld...")

    const response = await fetchWithRedirects("https://www.mangaworld.cx/")
    const html = await response.text()
    const $ = cheerio.load(html)

    const latestChapters: any[] = []

    // Scraping from the "Ultimi Capitoli Aggiunti" section
    $(".comics-grid .entry").each((index, element) => {
      if (index >= 18) return false // Limit to 18 items

      const $entry = $(element)
      const link = $entry.find("a.thumb")
      const href = link.attr("href")
      const title = link.attr("title") || $entry.find(".manga-title").text().trim()
      const image = $entry.find("img").attr("src")
      const type = $entry.find(".genre a").first().text().trim()
      const status = $entry.find(".status a").first().text().trim()

      // Extract chapters
      const chapters: any[] = []
      $entry.find(".d-flex.flex-wrap.flex-row").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        const chapterLink = $chapter.find("a.xanh")
        const chapterTitle = chapterLink.text().trim()
        const chapterUrl = chapterLink.attr("href")
        const isNew = $chapter.find('img[alt="Nuovo"]').length > 0
        const date = $chapter.find("i").text().trim()

        if (chapterTitle && chapterUrl) {
          chapters.push({
            title: chapterTitle,
            url: chapterUrl,
            isNew,
            date: date || undefined,
          })
        }
      })

      if (href && title && image && chapters.length > 0) {
        const urlMatch = href.match(/\/manga\/(\d+)\/([^/]+)/)
        if (urlMatch) {
          const [, id] = urlMatch

          latestChapters.push({
            id,
            title,
            image,
            type: type || "Manga",
            status: status || "In corso",
            chapters: chapters.slice(0, 3), // Limit to 3 chapters per manga
          })
        }
      }
    })

    console.log(`[v0] Successfully scraped ${latestChapters.length} latest manga chapters`)

    return NextResponse.json({
      ok: true,
      chapters: latestChapters,
    })
  } catch (error) {
    console.error("Latest manga chapters API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch latest chapters" }, { status: 500 })
  }
}
