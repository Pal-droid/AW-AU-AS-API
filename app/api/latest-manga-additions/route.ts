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

    if (response.ok) return response

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) throw new Error(`Redirect (${response.status}) without Location header`)
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
    console.log("[v0] Scraping latest manga additions from mangaworld...")
    const response = await fetchWithRedirects("https://www.mangaworld.cx/")
    const html = await response.text()
    const $ = cheerio.load(html)

    const latestAdditions: any[] = []

    // Scraping "Ultime aggiunte" section, limit to 5 items
    $(".latest-manga .entry").each((index, element) => {
      if (index >= 5) return false

      const $entry = $(element)
      const link = $entry.find("a.thumb")
      const href = link.attr("href")
      const title = link.attr("title") || $entry.find(".manga-title").text().trim()
      const image = $entry.find("img").attr("src")

      // Proper extraction with normalization
      let type = $entry.find(".font-weight-bold:contains('Tipo')").next("a").text().trim() || "Manga"
      let status = $entry.find(".font-weight-bold:contains('Stato')").next("a").text().trim() || "In corso"
      let date = $entry.find(".font-weight-bold:contains('Data')").next().text().trim() || new Date().toLocaleDateString("it-IT")

      // Collapse multiple spaces
      type = type.replace(/\s+/g, " ")
      status = status.replace(/\s+/g, " ")
      date = date.replace(/\s+/g, " ")

      if (href && title && image) {
        const urlMatch = href.match(/\/manga\/(\d+)\/([^/]+)/)
        if (urlMatch) {
          const [, id] = urlMatch
          latestAdditions.push({
            id,
            title,
            image,
            type,
            status,
            date,
            url: `/manga/${id}`,
          })
        }
      }
    })

    console.log(`[v0] Successfully scraped ${latestAdditions.length} latest additions`)

    return NextResponse.json({
      ok: true,
      additions: latestAdditions,
    })
  } catch (error) {
    console.error("Latest manga additions API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch latest additions" }, { status: 500 })
  }
}
