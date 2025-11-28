import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual", // Handle redirects manually
    })

    // If successful, return the response
    if (response.ok) {
      return response
    }

    // Handle redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header`)
      }

      // Make location absolute if it's relative
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString()
      console.log("[v0] Following redirect to: ${currentUrl}")
      continue
    }

    // If not a redirect and not successful, throw error
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const keyword = searchParams.get("keyword") || ""
  const type = searchParams.get("type") || ""
  const author = searchParams.get("author") || ""
  const year = searchParams.get("year") || ""
  const genre = searchParams.get("genre") || ""
  const artist = searchParams.get("artist") || ""
  const sort = searchParams.get("sort") || ""
  const page = searchParams.get("page") || "1"

  try {
    let searchUrl = "https://www.mangaworld.cx/archive"

    if (keyword || type || author || year || genre || artist || sort || page !== "1") {
      searchUrl += `?keyword=${encodeURIComponent(keyword)}`
      if (type && type !== "all") searchUrl += `&type=${encodeURIComponent(type)}`
      if (author) searchUrl += `&author=${encodeURIComponent(author)}`
      if (year) searchUrl += `&year=${year}`
      if (genre) searchUrl += `&genre=${encodeURIComponent(genre)}`
      if (artist) searchUrl += `&artist=${encodeURIComponent(artist)}`
      if (sort && sort !== "default") searchUrl += `&sort=${sort}`
      if (page !== "1") searchUrl += `&page=${page}`
    }

    console.log("[v0] Manga search URL:", searchUrl)

    const response = await fetchWithRedirects(searchUrl)

    const html = await response.text()
    console.log("[v0] HTML response length:", html.length)

    // Parse the HTML to extract manga results
    const mangaResults = parseMangaSearchResults(html)
    console.log("[v0] Parsed manga results count:", mangaResults.length)

    const pagination = parsePaginationData(html)
    console.log("[v0] Pagination data:", pagination)

    return NextResponse.json({ results: mangaResults, pagination })
  } catch (error) {
    console.error("Error fetching manga search results:", error)
    return NextResponse.json({ error: "Failed to fetch manga results" }, { status: 500 })
  }
}

function parsePaginationData(html: string) {
  try {
    // Looks for JSON with "totalPages" and "page" properties
    const regex = /"totalPages"\s*:\s*(\d+)\s*[,}][\s\S]*?"page"\s*:\s*(\d+)/
    const match = html.match(regex)

    if (match) {
      const totalPages = Number.parseInt(match[1], 10)
      const currentPage = Number.parseInt(match[2], 10)

      console.log("[v0] Parsed pagination - Current page:", currentPage, "Total pages:", totalPages)

      return {
        currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      }
    }

    console.log("[v0] No pagination data found in HTML")
    return null
  } catch (error) {
    console.error("[v0] Error parsing pagination data:", error)
    return null
  }
}

function parseMangaSearchResults(html: string) {
  const results: any[] = []

  try {
    const $ = cheerio.load(html)

    console.log("[v0] Loaded HTML with cheerio, looking for .comics-grid .entry elements...")

    $(".comics-grid .entry").each((i, el) => {
      try {
        const entry = $(el)

        // Extract manga URL and title from thumbnail link
        const thumbLink = entry.find("a.thumb")
        const mangaUrl = thumbLink.attr("href") || ""
        const mangaTitle = thumbLink.attr("title") || ""
        const imageUrl = entry.find("a.thumb img").attr("src") || ""

        let mangaId = ""
        let mangaSlug = ""
        if (mangaUrl) {
          // Parse URL like: https://www.mangaworld.cx/manga/3118/kaoru-hana-wa-rin-to-saku
          const urlParts = mangaUrl.split("/")
          const mangaIndex = urlParts.findIndex((part) => part === "manga")
          if (mangaIndex !== -1 && urlParts[mangaIndex + 1] && urlParts[mangaIndex + 2]) {
            mangaId = urlParts[mangaIndex + 1]
            mangaSlug = urlParts[mangaIndex + 2]
          }
        }

        // Extract type from genre div
        const type = entry.find(".genre a").first().text().trim()

        // Extract status
        const status = entry.find(".status a").first().text().trim()

        // Extract author
        const author = entry.find(".author a").first().text().trim()

        // Extract artist
        const artist = entry.find(".artist a").first().text().trim()

        // Extract genres array
        const genres = entry
          .find(".genres a")
          .map((_, g) => $(g).text().trim())
          .get()

        // Extract story/plot
        const storyText = entry.find(".story").text()
        const story = storyText.replace(/^Trama:\s*/, "").trim()

        const manga = {
          title: mangaTitle,
          url: mangaUrl,
          image: imageUrl,
          type,
          status,
          author,
          artist,
          genres,
          story,
          mangaId,
          mangaSlug,
        }

        console.log(`[v0] Successfully parsed manga ${i + 1}: ${mangaTitle}`)
        results.push(manga)
      } catch (error) {
        console.error(`[v0] Error parsing entry ${i + 1}:`, error)
      }
    })

    console.log(`[v0] Total parsed manga: ${results.length}`)
    return results
  } catch (error) {
    console.error("[v0] Error loading HTML with cheerio:", error)
    return results
  }
}
