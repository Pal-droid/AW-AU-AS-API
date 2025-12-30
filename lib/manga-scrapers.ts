import * as cheerio from "cheerio"
import { normalizeTitle, stringSimilarity } from "./utils"

export interface ScrapedManga {
  title: string
  slug: string
  id: string
  hash_id?: string
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
        redirect: "follow",
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
      const url = `${this.API_BASE}/manga?keyword=${encodeURIComponent(query)}&order[relevance]=desc&limit=20`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

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
      return results
    } catch (err) {
      console.error("[v0] Comix search error:", err)
      return []
    }
  }

  async getChapters(hashId: string): Promise<ScrapedChapter[]> {
    try {
      const limit = 100
      const baseUrl = `${this.API_BASE}/manga/${hashId}/chapters?limit=${limit}&order[number]=desc`

      // First page request
      const firstRes = await this.fetchWithTimeout(baseUrl)
      if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`)
      const firstData = await firstRes.json()

      if (!firstData.result?.items) return []

      const totalPages = firstData.result.pagination?.last_page || 1
      const allChapters: ScrapedChapter[] = []

      // Process first page chapters
      for (const item of firstData.result.items) {
        allChapters.push({
          chapter_number: Number(item.number),
          id: String(item.chapter_id),
          url: `https://comix.to/title/${hashId}/chapter-${item.number}`,
          title: `Chapter ${item.number}`,
          date: item.created_at,
        })
      }

      // Fetch remaining pages in parallel
      if (totalPages > 1) {
        const pagePromises = []
        for (let page = 2; page <= totalPages; page++) {
          const pageUrl = `${baseUrl}&page=${page}`
          pagePromises.push(
            this.fetchWithTimeout(pageUrl)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.result?.items) {
                  return data.result.items.map((item: any) => ({
                    chapter_number: Number(item.number),
                    id: String(item.chapter_id),
                    url: `https://comix.to/title/${hashId}/chapter-${item.number}`,
                    title: `Chapter ${item.number}`,
                    date: item.created_at,
                  }))
                }
                return []
              })
              .catch((err) => {
                console.error(`[v0] Comix chapters page ${page} error:`, err)
                return []
              }),
          )
        }

        const additionalPages = await Promise.all(pagePromises)
        for (const pageChapters of additionalPages) {
          allChapters.push(...pageChapters)
        }
      }

      return allChapters.sort((a, b) => a.chapter_number - b.chapter_number)
    } catch (err) {
      console.error("[v0] Comix chapters error:", err)
      return []
    }
  }

  async getPages(hashId: string, slug: string, chapterId: string, chapterNumber: number): Promise<ScrapedPage[] | any> {
    const url = `https://comix.to/title/${hashId}-${slug}/${chapterId}-chapter-${chapterNumber}`
    try {
      console.log(`[v0] Comix fetching pages from: ${url}`)
      const res = await this.fetchWithTimeout(url)

      if (!res.ok) {
        return { source: "Comix", error: `HTTP ${res.status}`, requested_url: url, pages: [] }
      }

      const html = await res.text()

      /**
       * FIX: Next.js Stream Parsing
       * Comix uses Next.js streaming where JSON is inside a string with escaped quotes (\").
       * We look for the "images" key with optional escaped quotes and capture the array.
       */
      const imagesMatch = html.match(/\\"images\\"\s*:\s*(\[[\s\S]*?\])/)

      if (!imagesMatch) {
        console.warn(`[v0] Comix: Regex failed to find images array at ${url}`)
        return {
          source: "Comix",
          error: "Images array not found in script payload",
          requested_url: url,
          pages: [],
        }
      }

      // 1. Clean escaped quotes: \"url\" -> "url"
      // 2. Parse the result
      const cleanedJson = imagesMatch[1].replace(/\\"/g, '"')
      const imagesData = JSON.parse(cleanedJson)

      const pages: ScrapedPage[] = imagesData.map((item: any, index: number) => ({
        page_number: index + 1,
        url: item.url,
      }))

      if (pages.length === 0) {
        return { source: "Comix", error: "Parsed image array is empty", requested_url: url, pages: [] }
      }

      return pages
    } catch (err: any) {
      console.error(`[v0] Comix pages error:`, err)
      return {
        source: "Comix",
        error: err.message || "Unknown error during parsing",
        requested_url: url,
        pages: [],
      }
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
      const url = `${this.BASE_URL}/archive?keyword=${encodeURIComponent(query)}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results: ScrapedManga[] = []

      $(".entry").each((_, el) => {
        const titleLink = $(el).find("a.manga-title")
        const mangaUrl = titleLink.attr("href")
        if (!titleLink.text() || !mangaUrl) return

        const urlParts = mangaUrl.split("/")
        results.push({
          title: titleLink.text().trim(),
          slug: urlParts[urlParts.length - 1],
          id: urlParts[urlParts.length - 2],
          url: mangaUrl,
          poster: $(el).find("img").attr("src"),
          description: $(el).find(".story").text().replace("Trama:", "").trim(),
          source: "World",
        })
      })
      return results
    } catch (err) {
      console.error("[v0] MangaWorld search error:", err)
      return []
    }
  }

  async getChapters(mangaId: string, slug: string): Promise<ScrapedChapter[]> {
    try {
      const url = `${this.BASE_URL}/manga/${mangaId}/${slug}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const chapters: ScrapedChapter[] = []

      $(".chapter a.chap").each((_, el) => {
        const chapterUrl = $(el).attr("href")
        const chapterText = $(el).find("span.d-inline-block").text().trim()
        if (!chapterUrl) return
        const match = chapterText.match(/(?:Capitolo|Chapter)\s*(\d+(?:\.\d+)?)/i)
        if (!match) return

        chapters.push({
          chapter_number: Number.parseFloat(match[1]),
          id: chapterUrl.split("/").pop() || "",
          url: chapterUrl,
          title: chapterText,
          date: $(el).find(".chap-date").text().trim(),
        })
      })
      return chapters.sort((a, b) => a.chapter_number - b.chapter_number)
    } catch (err) {
      console.error("[v0] MangaWorld chapters error:", err)
      return []
    }
  }

  async getPages(chapterUrl: string): Promise<ScrapedPage[] | any> {
    const listUrl = chapterUrl.includes("?") ? `${chapterUrl}&style=list` : `${chapterUrl}/1?style=list`
    try {
      const res = await this.fetchWithTimeout(listUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const pages: ScrapedPage[] = []

      $("img.page-image").each((index, el) => {
        const src = $(el).attr("src")
        if (src) pages.push({ page_number: index + 1, url: src })
      })

      if (pages.length === 0) {
        return { source: "World", error: "No images found", requested_url: listUrl, pages: [] }
      }
      return pages
    } catch (err: any) {
      return { source: "World", error: err.message, requested_url: listUrl, pages: [] }
    }
  }
}
