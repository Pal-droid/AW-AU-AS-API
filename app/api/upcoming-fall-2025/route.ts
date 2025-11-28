// Force Node runtime so https.Agent works
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import https from "https"
import axios from "axios"

export async function GET() {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false })

    const { data: html } = await axios.get("https://www.animeworld.ac/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent,
      maxRedirects: 5,
    })

    const $ = cheerio.load(html)
    const upcomingAnime: any[] = []
    let widgetTitle = ""

    // Loop through all widgets and find the one with /upcoming/ in its link
    $(".widget").each((_, widget) => {
      const $widget = $(widget)
      const moreLink = $widget.find(".widget-title .more").attr("href") || ""
      const titleElem = $widget.find(".widget-title .title")
      const titleText = titleElem.text().trim()

      console.log("[v0] Widget title found:", titleText, "Link:", moreLink)

      // Only process widgets that are upcoming
      if (!moreLink.includes("/upcoming/")) return

      widgetTitle = titleText // capture the correct title

      // Select all items inside the carousel
      $widget.find(".owl-carousel .item").each((_, element) => {
        const $item = $(element)
        const $inner = $item.find(".inner")
        const $poster = $inner.find(".poster")
        const $nameLink = $inner.find(".name")

        const href = $poster.attr("href")
        const imgSrc = $poster.find("img").attr("src")
        const title = $nameLink.attr("title") || $nameLink.text().trim()
        const japaneseTitle = $nameLink.attr("data-jtitle") || ""
        const $status = $poster.find(".status")
        const isDub = $status.find(".dub").length > 0
        const isOna = $status.find(".ona").length > 0

        if (href && imgSrc && title) {
          upcomingAnime.push({
            id: href.split("/").pop()?.split(".")[0] || "",
            title,
            japaneseTitle,
            image: imgSrc.startsWith("http") ? imgSrc : `https://img.animeworld.ac${imgSrc}`,
            url: href.startsWith("http") ? href : `https://www.animeworld.ac${href}`,
            isDub,
            isOna,
            type: "upcoming",
          })
        }
      })
    })

    if (!widgetTitle) {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      let season = "Inverno"
      if (month >= 3 && month <= 5) season = "Primavera"
      else if (month >= 6 && month <= 8) season = "Estate"
      else if (month >= 9 && month <= 11) season = "Autunno"

      const seasonYear = month >= 9 ? year + 1 : year
      widgetTitle = `Uscite ${season} ${seasonYear}`
      console.log("[v0] Generated fallback title:", widgetTitle)
    }

    // Remove duplicates and limit to 20
    const uniqueAnime = upcomingAnime
      .filter((anime, index, self) => index === self.findIndex((a) => a.id === anime.id))
      .slice(0, 20)

    console.log("[v0] Final widget title being returned:", widgetTitle)

    return NextResponse.json({
      success: true,
      data: uniqueAnime,
      count: uniqueAnime.length,
      widgetTitle,
      debug: { foundItems: uniqueAnime.length },
    })
  } catch (error) {
    console.error("Error fetching upcoming anime:", error)

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    let season = "Inverno"
    if (month >= 3 && month <= 5) season = "Primavera"
    else if (month >= 6 && month <= 8) season = "Estate"
    else if (month >= 9 && month <= 11) season = "Autunno"

    const seasonYear = month >= 9 ? year + 1 : year
    const fallbackTitle = `Uscite ${season} ${seasonYear}`

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch upcoming anime",
        data: [],
        count: 0,
        widgetTitle: fallbackTitle,
        debug: { foundItems: 0 },
      },
      { status: 500 },
    )
  }
}
