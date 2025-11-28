import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { withCors } from "@/lib/cors"

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

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing manga ID" }, { status: 400 })
    }

    const decodedId = decodeURIComponent(id)
      .replace(/[^\w\s-]/g, "")
      .trim()
    if (!decodedId) {
      return NextResponse.json({ error: "Invalid manga ID after decoding" }, { status: 400 })
    }

    let mangaUrl: string
    if (decodedId.includes("/")) {
      mangaUrl = `https://www.mangaworld.cx/manga/${decodedId}`
    } else {
      console.log("[v0] Slug-only ID detected, attempting to find correct manga_id...")

      const searchStrategies = [
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId)}`,
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId.replace(/[-_]/g, " "))}`,
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId.split("-")[0])}`,
        ...(decodedId.match(/^\d+$/) ? [`https://www.mangaworld.cx/manga/${decodedId}`] : []),
      ]

      let foundUrl = null
      for (const searchUrl of searchStrategies) {
        try {
          console.log("[v0] Trying search strategy:", searchUrl)
          if (!searchUrl.includes("undefined") && !searchUrl.includes("null")) {
            const searchResponse = await fetchWithRedirects(searchUrl)
            const searchHtml = await searchResponse.text()
            const $search = cheerio.load(searchHtml)

            $search(".comics-grid .entry").each((_, element) => {
              const $entry = $search(element)
              const thumbLink = $entry.find("a.thumb")
              const resultUrl = thumbLink.attr("href")
              const resultTitle = thumbLink.attr("title") || $entry.find(".entry-title").text().trim()

              if (resultUrl && resultUrl.includes("/manga/")) {
                const urlParts = resultUrl.split("/")
                const mangaIndex = urlParts.findIndex((part) => part === "manga")

                if (mangaIndex !== -1 && urlParts[mangaIndex + 1] && urlParts[mangaIndex + 2]) {
                  const extractedId = urlParts[mangaIndex + 1]
                  const extractedSlug = urlParts[mangaIndex + 2]
                  const searchTerm = decodedId.toLowerCase().replace(/[-_]/g, " ")
                  const titleLower = resultTitle.toLowerCase()
                  const slugLower = extractedSlug.toLowerCase().replace(/[-_]/g, " ")

                  if (
                    extractedSlug === decodedId ||
                    slugLower.includes(searchTerm) ||
                    titleLower.includes(searchTerm)
                  ) {
                    foundUrl = `https://www.mangaworld.cx/manga/${extractedId}/${extractedSlug}`
                    console.log("[v0] Found matching manga URL with ID:", foundUrl)
                    return false
                  }
                }
              }
            })

            if (foundUrl) break
          }
        } catch (searchError) {
          console.log("[v0] Search strategy failed:", searchError)
          continue
        }
      }

      mangaUrl = foundUrl || `https://www.mangaworld.cx/manga/${decodedId}`
    }

    if (!mangaUrl || mangaUrl.endsWith("/manga/") || mangaUrl.includes("undefined")) {
      return NextResponse.json({ error: "Could not construct valid manga URL" }, { status: 400 })
    }

    console.log("[v0] Fetching manga from:", mangaUrl)
    const response = await fetchWithRedirects(mangaUrl)
    const html = await response.text()
    const $ = cheerio.load(html)

    const title = $("h1.entry-title").text().trim() || $("title").text().split(" - ")[0]
    if (!title || title.toLowerCase().includes("not found") || title.toLowerCase().includes("404")) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 })
    }

    const image =
      $(".thumb img").attr("src") ||
      $(".entry-thumb img").attr("src") ||
      $(".manga-thumb img").attr("src") ||
      $("div.thumb img.rounded").attr("src")

    // helpers to extract meta
    function extractMeta(label: string): string {
      const el = $(`.meta-data span.font-weight-bold:contains("${label}")`).first()
      if (!el.length) return ""
      const parent = el.parent()
      const link = parent.find("a").first()
      if (link.length) return link.text().trim()
      return el[0].nextSibling?.nodeValue?.trim() || ""
    }

    function extractGenres(): string[] {
      const el = $(`.meta-data span.font-weight-bold:contains("Generi")`).first()
      if (!el.length) return []
      return el
        .parent()
        .find("a")
        .map((_, g) => $(g).text().trim())
        .get()
    }

    const type = extractMeta("Tipo")
    const status = extractMeta("Stato")
    const author = extractMeta("Autore")
    const artist = extractMeta("Artista")
    const year = extractMeta("Anno di uscita")
    const genres = extractGenres()

    // trama
    const trama =
      $('.heading:contains("TRAMA")').next("#noidungm").text().trim() ||
      $("#noidungm").text().trim() ||
      $(".manga-summary").text().trim() ||
      $(".entry-content p").first().text().trim()

    // chapters & volumes
    const volumes: any[] = []

    $(".volume-element").each((_, volumeEl) => {
      const $volume = $(volumeEl)
      const volumeName = $volume.find(".volume-name").text().trim()
      const volumeImage = $volume.find("[data-volume-image]").attr("data-volume-image")
      const chapters: any[] = []

      $volume.find(".volume-chapters .chapter").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        const chapterLink = $chapter.find(".chap").first()
        if (!chapterLink.length) return

        const chapterTitle = chapterLink.find("span.d-inline-block").first().text().trim()
        const chapterDate = chapterLink.find("i.chap-date").first().text().trim()
        const chapterUrl = chapterLink.attr("href")
        const isNew = $chapter.find('img[alt="Nuovo"]').length > 0

        if (chapterTitle && chapterUrl) {
          chapters.push({ title: chapterTitle, url: chapterUrl, date: chapterDate, isNew })
        }
      })

      if (volumeName || chapters.length) {
        volumes.push({ name: volumeName || "Volume", image: volumeImage, chapters })
      }
    })

    // fallback for mangas without volumes
    if (volumes.length === 0) {
      const chapters: any[] = []
      $(".chapters-wrapper .chapter, .chapter-list .chapter, .chapters-list .chapter").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        const chapterLink = $chapter.find("a.chap").first() || $chapter.find("a").first()
        if (!chapterLink.length) return

        const chapterTitle = chapterLink.find("span.d-inline-block").first().text().trim() || chapterLink.text().trim()
        const chapterDate =
          chapterLink.find("i.chap-date").first().text().trim() ||
          $chapter.find(".chap-date, .date, .chapter-date").text().trim()
        const chapterUrl = chapterLink.attr("href")
        const isNew = $chapter.find('img[alt="Nuovo"]').length > 0

        if (chapterTitle && chapterUrl) {
          chapters.push({ title: chapterTitle, url: chapterUrl, date: chapterDate, isNew })
        }
      })
      if (chapters.length > 0) volumes.push({ name: "Chapters", chapters })
    }

    const mangaData = { title, image, type, status, author, artist, year, genres, trama, volumes, url: mangaUrl }
    return NextResponse.json(mangaData)
  } catch (error) {
    console.error("[v0] Error fetching manga metadata:", error)
    return NextResponse.json({ error: "Failed to fetch manga metadata", details: String(error) }, { status: 500 })
  }
})
