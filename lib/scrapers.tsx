import * as cheerio from "cheerio"
import stringSimilarity from "string-similarity"

export interface ScrapedAnime {
  title: string
  url: string
  id: string
  poster?: string
  description?: string
  source: string
  sources?: { name: string; url: string; id: string }[]
}

export interface ScrapedEpisode {
  episode_number: number
  id: string
  url: string
}

export interface ScrapedStream {
  stream_url?: string
  embed?: string
  provider?: string
}

/** -------------------------
 * Base Scraper
 * ------------------------- */
class BaseScraper {
  protected timeout = 30000
  protected headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  }

  protected async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const fetchOptions: RequestInit = { headers: this.headers, signal: controller.signal }

      if (typeof process !== "undefined" && process.env.NODE_ENV) {
        const https = await import("https")
        const agent = new https.Agent({ rejectUnauthorized: false })
        // @ts-ignore
        fetchOptions.agent = agent
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
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ita/gi, "") // remove (ITA)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findMatchingKey(map: Map<string, ScrapedAnime>, title: string): string | undefined {
  const normalized = normalizeTitle(title)
  let bestMatch: string | undefined
  let bestScore = 0
  const threshold = 0.7

  for (const key of map.keys()) {
    const score = stringSimilarity.compareTwoStrings(normalized, key)
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
export function aggregateAnime(results: ScrapedAnime[][]): ScrapedAnime[] {
  const map = new Map<string, ScrapedAnime>()

  for (const sourceResults of results) {
    for (const anime of sourceResults) {
      const normalizedTitle = normalizeTitle(anime.title)
      const matchKey = findMatchingKey(map, normalizedTitle)

      if (matchKey) {
        const existing = map.get(matchKey)!
        if (!existing.poster && anime.poster) existing.poster = anime.poster
        if (!existing.description && anime.description) existing.description = anime.description

        if (!existing.sources) existing.sources = []
        for (const src of anime.sources ?? [{ name: anime.source, url: anime.url, id: anime.id }]) {
          if (!existing.sources.find((s) => s.id === src.id)) {
            existing.sources.push(src)
          }
        }
      } else {
        map.set(normalizedTitle, {
          ...anime,
          sources: anime.sources ?? [{ name: anime.source, url: anime.url, id: anime.id }],
        })
      }
    }
  }
  return Array.from(map.values())
}

export function aggregateEpisodes(allEpisodes: ScrapedEpisode[][]): ScrapedEpisode[] {
  const map = new Map<number, ScrapedEpisode>()
  for (const episodes of allEpisodes) {
    for (const ep of episodes) {
      if (!map.has(ep.episode_number)) map.set(ep.episode_number, ep)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.episode_number - b.episode_number)
}

/** -------------------------
 * AnimeWorld Scraper
 * ------------------------- */
export class AnimeWorldScraper extends BaseScraper {
  private readonly BASE_URL = "https://www.animeworld.ac"

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      const url = `${this.BASE_URL}/search?keyword=${encodeURIComponent(query)}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results: ScrapedAnime[] = []

      $(".film-list .item").each((_, el) => {
        const nameEl = $(el).find("a.name")
        if (!nameEl.length) return
        const relativeUrl = nameEl.attr("href")
        const title = nameEl.attr("data-jtitle") || nameEl.text().trim()
        if (!relativeUrl) return

        const fullUrl = new URL(relativeUrl, this.BASE_URL).href

        let animeId: string | null = null
        const pathParts = relativeUrl.replace(/^\/+|\/+$/g, "").split("/")
        if (pathParts.length >= 2 && pathParts[0] === "play") animeId = pathParts[1]
        else animeId = pathParts[pathParts.length - 1]

        const imgEl = $(el).find("img")
        let posterUrl = imgEl.attr("src")
        if (posterUrl && !posterUrl.startsWith("http")) posterUrl = new URL(posterUrl, this.BASE_URL).href

        if (animeId) results.push({ title, url: fullUrl, id: animeId, poster: posterUrl, source: "AnimeWorld" })
      })

      return results
    } catch (err) {
      console.error("AnimeWorld search error:", err)
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      const url = `${this.BASE_URL}/play/${animeId}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const episodes: ScrapedEpisode[] = []

      $("div.server ul.episodes li.episode a").each((_, el) => {
        const $el = $(el)
        const num = Number.parseInt($el.attr("data-episode-num") || "")
        const epId = $el.attr("data-id")
        const epUrl = $el.attr("href")
        if (num && epId && epUrl)
          episodes.push({ episode_number: num, id: `${animeId}/${epId}`, url: new URL(epUrl, this.BASE_URL).href })
      })

      return episodes.sort((a, b) => a.episode_number - b.episode_number)
    } catch (err) {
      console.error("AnimeWorld episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string): Promise<string | null> {
    try {
      const url = episodeId.includes("/")
        ? `${this.BASE_URL}/play/${episodeId}`
        : `${this.BASE_URL}/play/episode/${episodeId}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      return (
        $("#alternativeDownloadLink").attr("href") ||
        $("#downloadLink").attr("href") ||
        $("#customDownloadButton").attr("href") ||
        $("video, iframe").first().attr("src") ||
        null
      )
    } catch (err) {
      console.error("AnimeWorld stream error:", err)
      return null
    }
  }
}

/** -------------------------
 * AnimeSaturn Scraper
 * ------------------------- */
export class AnimeSaturnScraper extends BaseScraper {
  private readonly BASE_URL = "https://www.animesaturn.cx"

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      const url = `${this.BASE_URL}/animelist?search=${encodeURIComponent(query)}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results: ScrapedAnime[] = []

      $("ul.list-group li.list-group-item").each((_, el) => {
        const titleLink = $(el).find("h3 a.badge-archivio")
        const animeUrl = titleLink.attr("href")
        const title = titleLink.text().trim()
        if (!animeUrl || !title) return

        const urlPath = new URL(animeUrl, this.BASE_URL).pathname
        const animeId = urlPath.replace("/anime/", "")

        let poster = $(el).find("img.copertina-archivio").attr("src")
        if (poster && !poster.startsWith("http")) poster = new URL(poster, this.BASE_URL).href

        const description = $(el).find("p.trama-anime-archivio").text().trim() || undefined

        if (animeId) {
          results.push({
            title,
            url: animeUrl.startsWith("http") ? animeUrl : new URL(animeUrl, this.BASE_URL).href,
            id: animeId,
            poster,
            description,
            source: "AnimeSaturn",
          })
        }
      })

      return results
    } catch (err) {
      console.error("AnimeSaturn search error:", err)
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      const url = `${this.BASE_URL}/anime/${animeId}`
      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const episodes: ScrapedEpisode[] = []

      $(".btn-group.episodes-button a.btn.bottone-ep").each((_, el) => {
        const epUrl = $(el).attr("href")
        const epText = $(el).text().trim()
        const match = epText.match(/Episodio\s+(\d+)/i)
        if (!epUrl || !match) return

        const num = Number.parseInt(match[1])
        const epId = epUrl.replace("/ep/", "").replace(this.BASE_URL, "")

        episodes.push({
          episode_number: num,
          id: epId,
          url: epUrl.startsWith("http") ? epUrl : new URL(epUrl, this.BASE_URL).href,
        })
      })

      return episodes.sort((a, b) => a.episode_number - b.episode_number)
    } catch (err) {
      console.error("AnimeSaturn episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string): Promise<ScrapedStream | null> {
    try {
      const episodeUrl = episodeId.startsWith("http") ? episodeId : `${this.BASE_URL}/ep/${episodeId}`
      const res = await this.fetchWithTimeout(episodeUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      const watchLink = $('a[href*="/watch"] .btn').parent().attr("href") || $('a[href*="/watch"]').attr("href")
      if (!watchLink) return null

      const fullWatchUrl = watchLink.startsWith("http") ? watchLink : new URL(watchLink, this.BASE_URL).href

      const streamRes = await this.fetchWithTimeout(fullWatchUrl)
      if (!streamRes.ok) throw new Error(`HTTP ${streamRes.status}`)
      const streamHtml = await streamRes.text()
      const $stream = cheerio.load(streamHtml)

      const afterglowVideo = $stream("video.afterglow source[src*='.mp4']").attr("src")
      if (afterglowVideo) {
        const mp4Url = afterglowVideo.startsWith("http") ? afterglowVideo : new URL(afterglowVideo, this.BASE_URL).href
        return {
          stream_url: mp4Url,
          embed: `<video class="afterglow" data-skin="dark" preload="metadata" width="900" height="500" controls>
  <source type="video/mp4" src="${mp4Url}" />
</video>`,
          provider: "AnimeSaturn-MP4",
        }
      }

      const scripts = $stream("script")
        .map((_, el) => $stream(el).html() || "")
        .get()
      for (const script of scripts) {
        const jwPlayerMatch = script.match(
          /jwplayer\s*$$\s*['"']player_hls['"]\s*$$\s*\.setup\s*\(\s*\{[^}]*file:\s*["']([^"']+\.m3u8)["']/,
        )
        if (jwPlayerMatch) {
          const m3u8Url = jwPlayerMatch[1]
          const fullM3u8Url = m3u8Url.startsWith("http") ? m3u8Url : new URL(m3u8Url, this.BASE_URL).href

          const thumbnailsUrl = fullM3u8Url.replace("playlist.m3u8", "thumbnails.vtt")
          const posterUrl = fullM3u8Url.replace("playlist.m3u8", "poster.jpg")

          return {
            stream_url: fullM3u8Url,
            embed: `<div class='embed-container'>
  <div class="embed-responsive embed-responsive-16by9" style="max-width: 900px; max-height: 507px;">
    <div class="embed-responsive-item">
      <script type="text/javascript">jwplayer.key="HZe74PoMs7KHhWW6h0ai21mozIoLHwv64N0/fA==";</script>
      <div id='player_hls' class="video_holder">
        <p>Per poter vedere questo episodio abilita JavaScript<span class="old_browsers"> o aggiorna il tuo browser all'ultima versione disponibile</span>.</p>
      </div>
      <style>
        .jw-logo { content: ''; display: none !important; visibility: hidden !important; }
      </style>
      <script type='text/javascript'>
        jwplayer('player_hls').setup({
          file: "${fullM3u8Url}",
          tracks: [{ file: "${thumbnailsUrl}", kind: "thumbnails" }],
          image: "${posterUrl}",
          preload: "auto",
          abouttext: 'AnimeSaturn',
          aboutlink: '/',
          playbackRateControls: [0.50, 1, 1.50, 2, 2.50, 3, 3.50, 4, 4.50, 5],
          sharing: {heading: "Condividi"}
        });
      </script>
    </div>
  </div>
</div>`,
            provider: "AnimeSaturn-HLS",
          }
        }

        const simpleMatch = script.match(/file:\s*["']([^"']+\.m3u8)["']/)
        if (simpleMatch) {
          const m3u8Url = simpleMatch[1]
          const fullM3u8Url = m3u8Url.startsWith("http") ? m3u8Url : new URL(m3u8Url, this.BASE_URL).href
          return {
            stream_url: fullM3u8Url,
            provider: "AnimeSaturn-HLS-Simple",
          }
        }
      }

      const mp4 = $stream("video source[src*='.mp4']").attr("src")
      if (mp4) {
        const mp4Url = mp4.startsWith("http") ? mp4 : new URL(mp4, this.BASE_URL).href
        return {
          stream_url: mp4Url,
          provider: "AnimeSaturn-MP4-Fallback",
        }
      }

      return null
    } catch (err) {
      console.error("AnimeSaturn stream error:", err)
      return null
    }
  }
}

/** -------------------------
 * Aggregated Search & Episodes
 * ------------------------- */
export async function searchAnime(query: string): Promise<ScrapedAnime[]> {
  const awScraper = new AnimeWorldScraper()
  const asScraper = new AnimeSaturnScraper()
  const [awResults, asResults] = await Promise.all([awScraper.search(query), asScraper.search(query)])
  return aggregateAnime([awResults, asResults])
}

export async function getAllEpisodes(anime: ScrapedAnime): Promise<ScrapedEpisode[]> {
  const episodesList: ScrapedEpisode[][] = []
  for (const src of anime.sources ?? []) {
    let eps: ScrapedEpisode[] = []
    if (src.name === "AnimeWorld") {
      const scraper = new AnimeWorldScraper()
      eps = await scraper.getEpisodes(src.id)
    } else if (src.name === "AnimeSaturn") {
      const scraper = new AnimeSaturnScraper()
      eps = await scraper.getEpisodes(src.id)
    }
    episodesList.push(eps)
  }
  return aggregateEpisodes(episodesList)
}

/** -------------------------
 * Example Usage
 * ------------------------- */
async function example() {
  const results = await searchAnime("Naruto Shippuden")
  console.log("Merged search results:", results)

  if (results.length > 0) {
    const episodes = await getAllEpisodes(results[0])
    console.log(`Episodes for ${results[0].title}:`, episodes)

    if (episodes.length > 0) {
      const scraper = results[0].sources?.find((s) => s.name === "AnimeSaturn")
        ? new AnimeSaturnScraper()
        : new AnimeWorldScraper()
      const stream = await scraper.getStreamUrl(episodes[0].id)
      console.log("First episode stream URL:", stream)
    }
  }
}

// Uncomment to test
// example();
