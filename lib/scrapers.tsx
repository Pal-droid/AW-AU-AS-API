import * as cheerio from "cheerio"
import stringSimilarity from "string-similarity"
import { normalizeTitle } from "./utils"

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
      const fetchOptions: RequestInit = {
        headers: this.headers,
        signal: controller.signal,
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
        const title = nameEl.text().trim() // Updated to use text content instead of data-jtitle
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
      console.log(`[v0] AnimeSaturn search starting for query: "${query}"`)
      const url = `${this.BASE_URL}/animelist?search=${encodeURIComponent(query)}`
      console.log(`[v0] AnimeSaturn search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      console.log(`[v0] AnimeSaturn search HTML length: ${html.length}`)

      const $ = cheerio.load(html)
      const results: ScrapedAnime[] = []

      const listItems = $("ul.list-group li.list-group-item")
      console.log(`[v0] AnimeSaturn found ${listItems.length} list items`)

      listItems.each((index, el) => {
        console.log(`[v0] Processing AnimeSaturn item ${index + 1}`)

        // Look for the title link - it's in h3 > a.badge-archivio
        const titleLink = $(el).find("h3 a.badge-archivio")
        const animeUrl = titleLink.attr("href")
        const title = titleLink.text().trim()

        console.log(`[v0] AnimeSaturn item ${index + 1}: title="${title}", url="${animeUrl}"`)

        if (!animeUrl || !title) {
          console.log(`[v0] AnimeSaturn item ${index + 1}: skipping due to missing title or URL`)
          return
        }

        // Extract anime ID from URL path
        let animeId: string
        try {
          const urlPath = new URL(animeUrl, this.BASE_URL).pathname
          animeId = urlPath.replace("/anime/", "")
          console.log(`[v0] AnimeSaturn item ${index + 1}: extracted ID="${animeId}"`)
        } catch (e) {
          console.log(`[v0] AnimeSaturn item ${index + 1}: failed to extract ID from URL`)
          return
        }

        // Look for poster image
        let poster = $(el).find("img.locandina-archivio").attr("src")
        if (poster && !poster.startsWith("http")) {
          poster = new URL(poster, this.BASE_URL).href
        }
        console.log(`[v0] AnimeSaturn item ${index + 1}: poster="${poster}"`)

        // Look for description
        const description = $(el).find("p.trama-anime-archivio").text().trim() || undefined
        console.log(`[v0] AnimeSaturn item ${index + 1}: description length=${description?.length || 0}`)

        if (animeId) {
          const result = {
            title,
            url: animeUrl.startsWith("http") ? animeUrl : new URL(animeUrl, this.BASE_URL).href,
            id: animeId,
            poster,
            description,
            source: "AnimeSaturn",
          }
          results.push(result)
          console.log(`[v0] AnimeSaturn item ${index + 1}: added to results`)
        }
      })

      console.log(`[v0] AnimeSaturn search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] AnimeSaturn search error:", err)
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      console.log(`[v0] AnimeSaturn getEpisodes starting for ID: "${animeId}"`)
      const url = `${this.BASE_URL}/anime/${animeId}`
      console.log(`[v0] AnimeSaturn episodes URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      console.log(`[v0] AnimeSaturn episodes HTML length: ${html.length}`)

      const $ = cheerio.load(html)
      const episodes: ScrapedEpisode[] = []

      const episodeButtons = $(".btn-group.episodes-button a.btn.bottone-ep")
      console.log(`[v0] AnimeSaturn found ${episodeButtons.length} episode buttons`)

      episodeButtons.each((index, el) => {
        const epUrl = $(el).attr("href")
        const epText = $(el).text().trim()

        console.log(`[v0] AnimeSaturn episode ${index + 1}: text="${epText}", url="${epUrl}"`)

        // Extract episode number from text like "Episodio 1" or "1"
        const match = epText.match(/(?:Episodio\s+)?(\d+)/i)
        if (!epUrl || !match) {
          console.log(`[v0] AnimeSaturn episode ${index + 1}: skipping due to missing URL or episode number`)
          return
        }

        const num = Number.parseInt(match[1])
        // Extract episode ID from URL
        let epId = epUrl.replace("/ep/", "").replace(this.BASE_URL, "")
        if (epId.startsWith("/")) epId = epId.substring(1)

        console.log(`[v0] AnimeSaturn episode ${index + 1}: number=${num}, id="${epId}"`)

        episodes.push({
          episode_number: num,
          id: epId,
          url: epUrl.startsWith("http") ? epUrl : new URL(epUrl, this.BASE_URL).href,
        })
      })

      const sortedEpisodes = episodes.sort((a, b) => a.episode_number - b.episode_number)
      console.log(`[v0] AnimeSaturn getEpisodes completed: ${sortedEpisodes.length} episodes`)
      return sortedEpisodes
    } catch (err) {
      console.error("[v0] AnimeSaturn episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string): Promise<ScrapedStream | null> {
    try {
      console.log(`[v0] AnimeSaturn getStreamUrl starting for ID: "${episodeId}"`)

      // Build episode URL
      const episodeUrl = episodeId.startsWith("http") ? episodeId : `${this.BASE_URL}/ep/${episodeId}`
      console.log(`[v0] AnimeSaturn episode URL: ${episodeUrl}`)

      const res = await this.fetchWithTimeout(episodeUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      console.log(`[v0] AnimeSaturn episode HTML length: ${html.length}`)

      const $ = cheerio.load(html)

      const altServerLink = $('#wtf a[href*="/watch"]').attr("href")

      if (altServerLink) {
        console.log(`[v0] AnimeSaturn found alternative server link: ${altServerLink}`)

        const fullAltUrl = altServerLink.startsWith("http") ? altServerLink : new URL(altServerLink, this.BASE_URL).href
        console.log(`[v0] AnimeSaturn full alternative watch URL: ${fullAltUrl}`)

        try {
          const altRes = await this.fetchWithTimeout(fullAltUrl)
          if (altRes.ok) {
            const altHtml = await altRes.text()
            const $alt = cheerio.load(altHtml)

            const videoSource =
              $alt("video#player-v source[src*='.m3u8']").attr("src") ||
              $alt("video#player-v source[type='application/x-mpegURL']").attr("src") ||
              $alt("video source[src*='.m3u8']").attr("src")

            if (videoSource) {
              const fullVideoUrl = videoSource.startsWith("http")
                ? videoSource
                : new URL(videoSource, this.BASE_URL).href
              console.log(`[v0] AnimeSaturn found Saturn-ALT stream: ${fullVideoUrl}`)

              return {
                stream_url: fullVideoUrl,
                embed: `<video class="video-js" controls preload="auto" width="900" height="500">
  <source src="${fullVideoUrl}" type="application/x-mpegURL" />
</video>`,
                provider: "Saturn-ALT",
              }
            } else {
              console.log("[v0] AnimeSaturn: no m3u8 source found in alternative server")
            }
          }
        } catch (altErr) {
          console.log(`[v0] AnimeSaturn alternative server failed, falling back to main: ${altErr}`)
        }
      } else {
        console.log("[v0] AnimeSaturn: no alternative server link found in div#wtf")
      }

      const watchLink =
        $('a[href*="/watch"]:not(#wtf a)').first().attr("href") ||
        $('a.btn[href*="/watch"]:not(#wtf a)').first().attr("href")
      console.log(`[v0] AnimeSaturn found watch link: ${watchLink}`)

      if (!watchLink) {
        console.log("[v0] AnimeSaturn: no watch link found")
        return null
      }

      const fullWatchUrl = watchLink.startsWith("http") ? watchLink : new URL(watchLink, this.BASE_URL).href
      console.log(`[v0] AnimeSaturn full watch URL: ${fullWatchUrl}`)

      const streamRes = await this.fetchWithTimeout(fullWatchUrl)
      if (!streamRes.ok) throw new Error(`HTTP ${streamRes.status}`)
      const streamHtml = await streamRes.text()
      console.log(`[v0] AnimeSaturn stream HTML length: ${streamHtml.length}`)

      const $stream = cheerio.load(streamHtml)

      const afterglowVideo = $stream("video.afterglow source[src*='.mp4']").attr("src")
      console.log(`[v0] AnimeSaturn afterglow video found: ${afterglowVideo}`)

      if (afterglowVideo) {
        const mp4Url = afterglowVideo.startsWith("http") ? afterglowVideo : new URL(afterglowVideo, this.BASE_URL).href
        console.log(`[v0] AnimeSaturn returning MP4 stream: ${mp4Url}`)

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

      console.log(`[v0] AnimeSaturn found ${scripts.length} script tags`)

      for (const script of scripts) {
        // Look for jwplayer setup with HLS file
        const jwPlayerMatch = script.match(
          /jwplayer\s*$$\s*['"]player_hls['"]\s*$$\s*\.setup\s*\(\s*\{[^}]*file:\s*["']([^"']+\.m3u8)["']/,
        )

        if (jwPlayerMatch) {
          const m3u8Url = jwPlayerMatch[1]
          const fullM3u8Url = m3u8Url.startsWith("http") ? m3u8Url : new URL(m3u8Url, this.BASE_URL).href
          console.log(`[v0] AnimeSaturn found JWPlayer HLS: ${fullM3u8Url}`)

          const thumbnailsUrl = fullM3u8Url.replace("playlist.m3u8", "thumbnails.vtt")
          const posterUrl = fullM3u8Url.replace("playlist.m3u8", "poster.jpg")

          return {
            stream_url: fullM3u8Url,
            embed: `<div class='embed-container'>
  <div class="embed-responsive embed-responsive-16by9" style="max-webkit-transform: translate3d(0, 0, 0);width: 900px; max-height: 507px;">
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

        // Fallback: simple file match
        const simpleMatch = script.match(/file:\s*["']([^"']+\.m3u8)["']/)
        if (simpleMatch) {
          const m3u8Url = simpleMatch[1]
          const fullM3u8Url = m3u8Url.startsWith("http") ? m3u8Url : new URL(m3u8Url, this.BASE_URL).href
          console.log(`[v0] AnimeSaturn found simple HLS: ${fullM3u8Url}`)

          return {
            stream_url: fullM3u8Url,
            provider: "AnimeSaturn-HLS-Simple",
          }
        }
      }

      // Final fallback: any MP4 video
      const mp4 = $stream("video source[src*='.mp4']").attr("src")
      if (mp4) {
        const mp4Url = mp4.startsWith("http") ? mp4 : new URL(mp4, this.BASE_URL).href
        console.log(`[v0] AnimeSaturn found fallback MP4: ${mp4Url}`)

        return {
          stream_url: mp4Url,
          provider: "AnimeSaturn-MP4-Fallback",
        }
      }

      console.log("[v0] AnimeSaturn: no stream found")
      return null
    } catch (err) {
      console.error("[v0] AnimeSaturn stream error:", err)
      return null
    }
  }
}

/** -------------------------
 * AnimePahe Scraper
 * ------------------------- */
export class AnimePaheScraper extends BaseScraper {
  private readonly API_BASE = "https://animepahe-api-jqwp.onrender.com"

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      console.log(`[v0] AnimePahe search starting for query: "${query}"`)
      const url = `${this.API_BASE}/search?q=${encodeURIComponent(query)}`
      console.log(`[v0] AnimePahe search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log(`[v0] AnimePahe search returned ${data.length} results`)

      const results: ScrapedAnime[] = []

      for (const anime of data) {
        results.push({
          title: anime.title,
          url: anime.url,
          id: anime.session,
          poster: anime.poster,
          description: `${anime.type} (${anime.year})`,
          source: "AnimePahe",
        })
      }

      console.log(`[v0] AnimePahe search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] AnimePahe search error:", err)
      return []
    }
  }

  async getEpisodes(animeSession: string): Promise<ScrapedEpisode[]> {
    try {
      console.log(`[v0] AnimePahe getEpisodes starting for session: "${animeSession}"`)
      const url = `${this.API_BASE}/episodes?session=${encodeURIComponent(animeSession)}`
      console.log(`[v0] AnimePahe episodes URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log(`[v0] AnimePahe found ${data.length} episodes`)

      const episodes: ScrapedEpisode[] = []

      for (const ep of data) {
        episodes.push({
          episode_number: ep.number,
          id: ep.session,
          url: ep.snapshot || "",
        })
      }

      const sortedEpisodes = episodes.sort((a, b) => a.episode_number - b.episode_number)
      console.log(`[v0] AnimePahe getEpisodes completed: ${sortedEpisodes.length} episodes`)
      return sortedEpisodes
    } catch (err) {
      console.error("[v0] AnimePahe episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeSession: string, animeSession: string, resolution: string): Promise<ScrapedStream | null> {
    try {
      console.log(
        `[v0] AnimePahe getStreamUrl starting for episode: "${episodeSession}", anime: "${animeSession}", resolution: ${resolution}`,
      )

      // Step 1: Get the sources
      const sourcesUrl = `${this.API_BASE}/sources?anime_session=${encodeURIComponent(animeSession)}&episode_session=${encodeURIComponent(episodeSession)}`
      console.log(`[v0] AnimePahe sources URL: ${sourcesUrl}`)

      const sourcesRes = await this.fetchWithTimeout(sourcesUrl)
      if (!sourcesRes.ok) throw new Error(`HTTP ${sourcesRes.status}`)
      const sources = await sourcesRes.json()
      console.log(`[v0] AnimePahe found ${sources.length} sources:`, sources)

      if (!sources || sources.length === 0) {
        console.log("[v0] AnimePahe: no sources found")
        return null
      }

      // Step 2: Find the source matching the requested resolution
      let selectedSource = sources.find((s: any) => s.quality === `${resolution}p`)

      // Fallback to highest quality if requested resolution not found
      if (!selectedSource) {
        console.log(`[v0] AnimePahe: ${resolution}p not found, using highest quality`)
        selectedSource = sources[0]
      }

      console.log(`[v0] AnimePahe selected source: ${selectedSource.quality} - ${selectedSource.url}`)

      // Step 3: Resolve the m3u8 URL from the kwik link
      const m3u8Url = `${this.API_BASE}/m3u8?url=${encodeURIComponent(selectedSource.url)}`
      console.log(`[v0] AnimePahe m3u8 resolution URL: ${m3u8Url}`)

      const m3u8Res = await this.fetchWithTimeout(m3u8Url)
      if (!m3u8Res.ok) throw new Error(`HTTP ${m3u8Res.status}`)
      const m3u8Data = await m3u8Res.json()
      console.log(`[v0] AnimePahe resolved m3u8:`, m3u8Data)

      if (!m3u8Data.m3u8) {
        console.log("[v0] AnimePahe: no m3u8 URL found in response")
        return null
      }

      // Return the m3u8 URL (will be proxied in the stream endpoint)
      return {
        stream_url: m3u8Data.m3u8,
        provider: `AnimePahe-${selectedSource.quality}`,
      }
    } catch (err) {
      console.error("[v0] AnimePahe stream error:", err)
      return null
    }
  }
}

/** -------------------------
 * AniUnity Scraper
 * ------------------------- */
export class AniUnityScraper extends BaseScraper {
  private readonly API_BASE = "https://delicate-rubia-hachu-9b0ceeb1.koyeb.app"

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      console.log(`[v0] AniUnity search starting for query: "${query}"`)
      const url = `${this.API_BASE}/search?title=${encodeURIComponent(query)}`
      console.log(`[v0] AniUnity search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log(`[v0] AniUnity search returned ${data.length} results`)

      const results: ScrapedAnime[] = []

      for (const anime of data) {
        const isItalianDub = anime.slug && anime.slug.endsWith("-ita")
        const baseTitle = anime.title_en || anime.title_it || "Unknown Title"

        const title = isItalianDub && !baseTitle.includes("(ITA)") ? `${baseTitle} (ITA)` : baseTitle

        console.log(
          `[v0] AniUnity result: slug="${anime.slug}", title_en="${anime.title_en}", isItalianDub=${isItalianDub}, final title="${title}"`,
        )

        results.push({
          title,
          url: `${this.API_BASE}/anime/${anime.slug}`,
          id: String(anime.id),
          poster: anime.poster,
          description:
            anime.plot || `${anime.type} - ${anime.status} (${anime.date}) - Episodes: ${anime.episodes_count}`,
          source: "AniUnity",
        })
      }

      console.log(`[v0] AniUnity search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] AniUnity search error:", err)
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      console.log(`[v0] AniUnity getEpisodes starting for ID: "${animeId}"`)
      const url = `${this.API_BASE}/episodes?anime_id=${encodeURIComponent(animeId)}`
      console.log(`[v0] AniUnity episodes URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log(`[v0] AniUnity response:`, data)

      if (!data.episodes || !Array.isArray(data.episodes)) {
        console.log("[v0] AniUnity: no episodes array found")
        return []
      }

      console.log(`[v0] AniUnity found ${data.episodes.length} episodes`)

      const episodes: ScrapedEpisode[] = []

      for (const ep of data.episodes) {
        const episodeNumber = Number.parseInt(ep.number)
        if (!isNaN(episodeNumber)) {
          episodes.push({
            episode_number: episodeNumber,
            id: String(ep.episode_id),
            url: `${this.API_BASE}/stream_video?episode_id=${ep.episode_id}`,
          })
        }
      }

      const sortedEpisodes = episodes.sort((a, b) => a.episode_number - b.episode_number)
      console.log(`[v0] AniUnity getEpisodes completed: ${sortedEpisodes.length} episodes`)
      return sortedEpisodes
    } catch (err) {
      console.error("[v0] AniUnity episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string): Promise<ScrapedStream | null> {
    try {
      console.log(`[v0] AniUnity getStreamUrl starting for episode ID: "${episodeId}"`)

      // AniUnity provides direct stream URLs
      const streamUrl = `${this.API_BASE}/stream_video?episode_id=${encodeURIComponent(episodeId)}`
      console.log(`[v0] AniUnity stream URL: ${streamUrl}`)

      // Return the stream URL to be embedded in a video tag
      return {
        stream_url: streamUrl,
        embed: `<video 
  src="${streamUrl}" 
  class="w-full h-full" 
  controls 
  playsinline 
  preload="metadata" 
  autoplay>
</video>`,
        provider: "AniUnity",
      }
    } catch (err) {
      console.error("[v0] AniUnity stream error:", err)
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
  const apScraper = new AnimePaheScraper()
  const [awResults, asResults, apResults] = await Promise.all([
    awScraper.search(query),
    asScraper.search(query),
    apScraper.search(query),
  ])
  return aggregateAnime([awResults, asResults, apResults])
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
    } else if (src.name === "AnimePahe") {
      const scraper = new AnimePaheScraper()
      eps = await scraper.getEpisodes(src.id)
    }
    episodesList.push(eps)
  }
  return aggregateEpisodes(episodesList)
}
