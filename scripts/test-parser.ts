import * as cheerio from "cheerio"

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error("Usage: node scripts/test-parser.ts <chapter-url>")
    process.exit(1)
  }

  // Always force list mode
  let listUrl: string
  if (url.includes("?")) {
    const [baseUrl, queryString] = url.split("?")
    listUrl = `${baseUrl}/1?${queryString}&style=list`
  } else {
    listUrl = `${url}/1?style=list`
  }

  console.log("Fetching:", listUrl)

  const response = await fetch(listUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! ${response.status}`)
  }

  const html = await response.text()
  console.log("HTML length:", html.length)

  // Save HTML for inspection
  console.log("First 2000 chars of HTML:")
  console.log(html.substring(0, 2000))
  console.log("\n" + "=".repeat(50) + "\n")

  const pages = parseMangaPages(html, listUrl)
  console.log("Extracted pages:", pages.length)
  console.log(pages)
}

function parseMangaPages(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const pages: string[] = []

  console.log("Trying different selectors...")

  // Method 1: Look for div with id="page" and extract images
  const pageDiv = $("#page")
  if (pageDiv.length > 0) {
    console.log("Found #page div, extracting images...")
    pageDiv.find("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
      if (src && isValidMangaImage(src)) {
        pages.push(makeAbsolute(src, baseUrl))
      }
    })
  }

  // Method 2: Direct selectors for common patterns
  if (pages.length === 0) {
    console.log("Trying direct selectors...")
    const selectors = ['img[id^="page-"]', "img.page-image", ".reader-area img", ".reader img", ".chapter-content img"]

    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`)
      $(selector).each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (src && isValidMangaImage(src)) {
          pages.push(makeAbsolute(src, baseUrl))
        }
      })

      if (pages.length > 0) {
        console.log(`Found ${pages.length} images with selector: ${selector}`)
        break
      }
    }
  }

  // Method 3: Generic image search with filtering
  if (pages.length === 0) {
    console.log("Trying generic image search...")
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
      if (src && isValidMangaImage(src) && isMangaPageImage(src)) {
        pages.push(makeAbsolute(src, baseUrl))
      }
    })
  }

  return pages
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
  const mangaPatterns = ["mangaworld", "cdn", "chapter", "page", "/d+.(jpg|jpeg|png|webp)"]

  return mangaPatterns.some((pattern) => src.toLowerCase().includes(pattern.toLowerCase()))
}

function makeAbsolute(url: string, base: string): string {
  if (url.startsWith("http")) return url
  const baseOrigin = new URL(base).origin
  return baseOrigin + (url.startsWith("/") ? url : "/" + url)
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
