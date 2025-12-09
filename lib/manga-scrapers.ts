import * as cheerio from "cheerio"
import { normalizeTitle, stringSimilarity } from "./utils"

export interface ScrapedManga {
  title: string
  slug: string
  id: string
  hash_id?: string // For Comix
  url?: string
  poster?: string
  description?: string
  source: string
  status?: string
  type?: string
  author?: string
  genres?: string[]
  sources?: { name: string; slug: string; id: string; hash_id?: string }[]
}

export interface ScrapedChapter {
  chapter_number: number
  id: string
  url: string
  title?: string
  date?: string
}

export interface ScrapedPage {
  page_number: number
  url: string
}

/** -------------------------
 * Base Manga Scraper
 * ------------------------- */
class BaseMangaScraper {
  protected timeout = 30000
  protected headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  }

  protected async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const fetchOptions: RequestInit = {
        headers: this.headers,
        signal: controller.signal,
        redirect: "follow", // Added redirect following for MangaWorld
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

/** -------------------------
 * Normalization & Matching
 * ------------------------- */
function findMatchingKey(map: Map<string, ScrapedManga>, title: string): string | undefined {
  const normalized = normalizeTitle(title)
  let bestMatch: string | undefined
  let bestScore = 0
  const threshold = 0.8

  for (const key of map.keys()) {
    const score = stringSimilarity(normalized, key)
    if (score > threshold && score > bestScore) {
      bestScore = score
      bestMatch = key
    }
  }
  return bestMatch
}

/** -------------------------
 * Aggregation
 * ------------------------- */
export function aggregateManga(results: ScrapedManga[][]): ScrapedManga[] {
  const map = new Map<string, ScrapedManga>()

  for (const sourceResults of results) {
    for (const manga of sourceResults) {
      const normalizedTitle = normalizeTitle(manga.title)
      const matchKey = findMatchingKey(map, normalizedTitle)

      if (matchKey) {
        const existing = map.get(matchKey)!
        if (!existing.poster && manga.poster) existing.poster = manga.poster
        if (!existing.description && manga.description) existing.description = manga.description

        if (!existing.sources) existing.sources = []
        for (const src of manga.sources ?? [
          { name: manga.source, slug: manga.slug, id: manga.id, hash_id: manga.hash_id },
        ]) {
          const existingFromSameSource = existing.sources.find((s) => s.name === src.name)
          if (!existingFromSameSource) {
            existing.sources.push(src)
          }
        }
      } else {
        map.set(normalizedTitle, {
          ...manga,
          sources: manga.sources ?? [{ name: manga.source, slug: manga.slug, id: manga.id, hash_id: manga.hash_id }],
        })
      }
    }
  }
  return Array.from(map.values())
}

export function aggregateChapters(allChapters: ScrapedChapter[][]): ScrapedChapter[] {
  const map = new Map<number, ScrapedChapter>()
  for (const chapters of allChapters) {
    for (const ch of chapters) {
      if (!map.has(ch.chapter_number)) map.set(ch.chapter_number, ch)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.chapter_number - b.chapter_number)
}

/** -------------------------
 * Comix Scraper
 * ------------------------- */
export class ComixScraper extends BaseMangaScraper {
  private readonly API_BASE = "https://comix.to/api/v2"

  async search(query: string): Promise<ScrapedManga[]> {
    try {
      console.log(`[v0] Comix search starting for query: "${query}"`)
      const url = `${this.API_BASE}/manga?keyword=${encodeURIComponent(query)}&order[relevance]=desc&limit=20`
      console.log(`[v0] Comix search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      console.log(`[v0] Comix search response status: ${data.status}`)

      const results: ScrapedManga[] = []
      const items = data.result?.items || []

      for (const item of items) {
        results.push({
          title: item.title,
          slug: item.slug,
          id: String(item.manga_id),
          hash_id: item.hash_id,
          poster: item.poster?.large || item.poster?.medium || item.poster?.small,
          description: item.synopsis,
          source: "Comix",
          status: item.status,
          type: item.type,
        })
      }

      console.log(`[v0] Comix search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] Comix search error:", err)
      return []
    }
  }

  async getChapters(hashId: string, page = 1, limit = 100): Promise<ScrapedChapter[]> {
    try {
      console.log(`[v0] Comix getChapters starting for hash_id: "${hashId}"`)
      const url = `${this.API_BASE}/manga/${hashId}/chapters?limit=${limit}&page=${page}&order[number]=desc`
      console.log(`[v0] Comix chapters URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const chapters: ScrapedChapter[] = []
      const items = data.result?.items || []

      for (const item of items) {
        chapters.push({
          chapter_number: Number(item.number),
          id: String(item.chapter_id),
          url: `https://comix.to/title/${hashId}/chapter-${item.number}`,
          title: item.name || `Chapter ${item.number}`,
          date: item.created_at,
        })
      }

      console.log(`[v0] Comix getChapters completed: ${chapters.length} chapters`)
      return chapters.sort((a, b) => a.chapter_number - b.chapter_number)
    } catch (err) {
      console.error("[v0] Comix chapters error:", err)
      return []
    }
  }

  async getPages(hashId: string, slug: string, chapterId: string, chapterNumber: number): Promise<ScrapedPage[]> {
    try {
      console.log(`[v0] Comix getPages starting for chapter: "${chapterId}"`)
      // URL format: https://comix.to/title/<hash_id>-<slug>/<chapter_id>-chapter-<number>
      const url = `https://comix.to/title/${hashId}-${slug}/${chapterId}-chapter-${chapterNumber}`
      console.log(`[v0] Comix pages URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()

      // Extract images from script tag containing "images":["url1","url2",...]
      const imagesMatch = html.match(/"images"\s*:\s*\[([^\]]+)\]/)
      if (!imagesMatch) {
        console.log("[v0] Comix: no images found in page")
        return []
      }

      const imagesJson = `[${imagesMatch[1]}]`
      const imageUrls: string[] = JSON.parse(imagesJson)

      const pages: ScrapedPage[] = imageUrls.map((url, index) => ({
        page_number: index + 1,
        url: url,
      }))

      console.log(`[v0] Comix getPages completed: ${pages.length} pages`)
      return pages
    } catch (err) {
      console.error("[v0] Comix pages error:", err)
      return []
    }
  }
}

/** -------------------------
 * MangaWorld Scraper
 * ------------------------- */
export class MangaWorldScraper extends BaseMangaScraper {
  private readonly BASE_URL = "https://www.mangaworld.mx"

  async search(query: string): Promise<ScrapedManga[]> {
    try {
      console.log(`[v0] MangaWorld search starting for query: "${query}"`)
      const url = `${this.BASE_URL}/archive?keyword=${encodeURIComponent(query)}`
      console.log(`[v0] MangaWorld search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results: ScrapedManga[] = []

      $(".entry").each((_, el) => {
        const titleLink = $(el).find("a.manga-title")
        const title = titleLink.text().trim()
        const mangaUrl = titleLink.attr("href")

        if (!title || !mangaUrl) return

        // Extract slug from URL like https://www.mangaworld.mx/manga/678/toukyou-ghoul
        const urlParts = mangaUrl.split("/")
        const mangaId = urlParts[urlParts.length - 2] // e.g., "678"
        const slug = urlParts[urlParts.length - 1] // e.g., "toukyou-ghoul"

        const poster = $(el).find("img").attr("src")
        const description = $(el).find(".story").text().replace("Trama:", "").trim()
        const status = $(el).find(".status a").text().trim()
        const type = $(el).find(".genre a").first().text().trim()
        const author = $(el).find(".author a").text().trim()

        const genres: string[] = []
        $(el)
          .find(".genres a")
          .each((_, genreEl) => {
            genres.push($(genreEl).text().trim())
          })

        results.push({
          title,
          slug,
          id: mangaId,
          url: mangaUrl,
          poster,
          description,
          source: "World",
          status,
          type,
          author,
          genres,
        })
      })

      console.log(`[v0] MangaWorld search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] MangaWorld search error:", err)
      return []
    }
  }

  async getChapters(mangaId: string, slug: string): Promise<ScrapedChapter[]> {
    try {
      console.log(`[v0] MangaWorld getChapters starting for: "${mangaId}/${slug}"`)
      const url = `${this.BASE_URL}/manga/${mangaId}/${slug}`
      console.log(`[v0] MangaWorld chapters URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const chapters: ScrapedChapter[] = []

      $(".chapter a.chap").each((_, el) => {
        const chapterUrl = $(el).attr("href")
        const chapterText = $(el).find("span.d-inline-block").text().trim()
        const dateText = $(el).find(".chap-date").text().trim()

        if (!chapterUrl) return

        // Extract chapter number from text like "Capitolo 143"
        const match = chapterText.match(/(?:Capitolo|Chapter)\s*(\d+(?:\.\d+)?)/i)
        if (!match) return

        const chapterNum = Number.parseFloat(match[1])
        // Extract chapter ID from URL
        const urlParts = chapterUrl.split("/")
        const chapterId = urlParts[urlParts.length - 1]

        chapters.push({
          chapter_number: chapterNum,
          id: chapterId,
          url: chapterUrl,
          title: chapterText,
          date: dateText,
        })
      })

      console.log(`[v0] MangaWorld getChapters completed: ${chapters.length} chapters`)
      return chapters.sort((a, b) => a.chapter_number - b.chapter_number)
    } catch (err) {
      console.error("[v0] MangaWorld chapters error:", err)
      return []
    }
  }

  async getPages(chapterUrl: string): Promise<ScrapedPage[]> {
    try {
      console.log(`[v0] MangaWorld getPages starting for: "${chapterUrl}"`)
      // Convert to list mode
      const listUrl = chapterUrl.includes("?") ? `${chapterUrl}&style=list` : `${chapterUrl}/1?style=list`
      console.log(`[v0] MangaWorld pages URL: ${listUrl}`)

      const res = await this.fetchWithTimeout(listUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const pages: ScrapedPage[] = []

      $("img.page-image").each((index, el) => {
        const src = $(el).attr("src")
        if (src) {
          pages.push({
            page_number: index + 1,
            url: src,
          })
        }
      })

      console.log(`[v0] MangaWorld getPages completed: ${pages.length} pages`)
      return pages
    } catch (err) {
      console.error("[v0] MangaWorld pages error:", err)
      return []
    }
  }
}
