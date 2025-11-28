import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function GET() {
  try {
    const res = await fetch("https://www.mangaworld.cx/")
    const html = await res.text()
    const $ = cheerio.load(html)

    const mangas: any[] = []

    $(".row .top-wrapper .entry").each((_, el) => {
      const rankText = $(el).find(".short .indi").text().trim()
      const title = $(el).find(".short .name").text().trim()
      const url = $(el).find(".short a.chap").attr("href")?.trim()
      const image = $(el).find(".thumb img").attr("src")?.trim()
      const type = $(el).find(".content a[href*='type']").first().text().trim()
      const status = $(el).find(".content a[href*='status']").first().text().trim()
      const viewsMatch = $(el).find(".content").text().match(/Letto:\s*(\d+)/)
      const views = viewsMatch ? viewsMatch[1] : "0"

      // skip entries that don’t have a rank or title
      if (!rankText || !title || !url) return

      const rank = parseInt(rankText)

      mangas.push({
        rank,
        id: url.split("/")[4] || "", // extract manga id
        title,
        image: image || "/placeholder.svg",
        type,
        status,
        views,
        url,
      })
    })

    return NextResponse.json({ ok: true, mangas })
  } catch (error) {
    console.error("Error fetching manga of month:", error)
    return NextResponse.json({ ok: false, error: (error as any).message })
  }
}
