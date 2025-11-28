import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: new URL(currentUrl).origin,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
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
      console.log(`[v0] Following redirect to: ${currentUrl}`)
      continue
    }

    // If not a redirect and not successful, throw error
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const chapterUrl = searchParams.get("url")

  if (!chapterUrl) {
    return NextResponse.json({ error: "Chapter URL is required" }, { status: 400 })
  }

  try {
    let listUrl: string
    if (chapterUrl.includes("?")) {
      const [baseUrl, queryString] = chapterUrl.split("?")
      listUrl = `${baseUrl}/1?${queryString}&style=list`
    } else {
      listUrl = `${chapterUrl}/1?style=list`
    }

    console.log("[v0] Fetching chapter pages from:", listUrl)

    const response = await fetchWithRedirects(listUrl)

    const html = await response.text()
    console.log("[v0] HTML response length:", html.length)

    const pages = parseMangaPages(html, listUrl)
    console.log("[v0] Parsed pages count:", pages.length)

    return NextResponse.json({ pages })
  } catch (error) {
    console.error("Error fetching manga pages:", error)
    return NextResponse.json({ error: "Failed to fetch manga pages" }, { status: 500 })
  }
}

function parseMangaPages(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const pages: string[] = []

  try {
    console.log("[v0] Starting manga page extraction...")

    // Method 1: Look for div with id="page" (based on user's HTML structure)
    const pageDiv = $("#page")
    if (pageDiv.length > 0) {
      console.log("[v0] Found #page div, extracting images...")
      pageDiv.find("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (src && isValidMangaImage(src)) {
          pages.push(makeAbsolute(src, baseUrl))
        }
      })
    }

    // Method 2: Direct selectors for common manga reader patterns
    if (pages.length === 0) {
      console.log("[v0] Trying direct selectors...")
      const selectors = [
        'img[id^="page-"]', // Images with IDs starting with "page-"
        "img.page-image", // Images with page-image class
        ".reader-area img", // Images in reader area
        ".reader img", // Images in reader container
        ".chapter-content img", // Images in chapter content
      ]

      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
          if (src && isValidMangaImage(src)) {
            pages.push(makeAbsolute(src, baseUrl))
          }
        })

        if (pages.length > 0) {
          console.log(`[v0] Found ${pages.length} images with selector: ${selector}`)
          break
        }
      }
    }

    // Method 3: Generic image search with smart filtering
    if (pages.length === 0) {
      console.log("[v0] Trying generic image search with filtering...")
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (src && isValidMangaImage(src) && isMangaPageImage(src)) {
          pages.push(makeAbsolute(src, baseUrl))
        }
      })
    }

    console.log(`[v0] Successfully extracted ${pages.length} page images`)
    if (pages.length > 0) {
      console.log("[v0] First few pages:", pages.slice(0, 3))
    }

    return pages
  } catch (error) {
    console.error("[v0] Error parsing manga pages:", error)
    return pages
  }
}

function isValidMangaImage(src: string): boolean {
  if (!src) return false

  // Check for valid image extensions
  const hasValidExtension = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(src)
  if (!hasValidExtension) return false

  // Filter out common non-manga images
  const excludePatterns = ["placeholder", "logo", "avatar", "banner", "icon", "button", "bg", "background"]

  return !excludePatterns.some((pattern) => src.toLowerCase().includes(pattern))
}

function isMangaPageImage(src: string): boolean {
  // Additional checks for manga-specific patterns
  const mangaPatterns = ["mangaworld", "cdn", "chapter", "page", "/\\d+\\.(jpg|jpeg|png|webp)"]

  return mangaPatterns.some((pattern) => {
    if (pattern.includes("\\d")) {
      return new RegExp(pattern, "i").test(src)
    }
    return src.toLowerCase().includes(pattern.toLowerCase())
  })
}

function makeAbsolute(url: string, base: string): string {
  if (url.startsWith("http")) return url
  const baseOrigin = new URL(base).origin
  return baseOrigin + (url.startsWith("/") ? url : "/" + url)
}
