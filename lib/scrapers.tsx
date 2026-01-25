import * as cheerio from "cheerio"
import { normalizeTitle, stringSimilarity } from "./utils"

export interface ScrapedAnime {
  title: string
  slug: string
  id: string
  url?: string
  poster?: string
  description?: string
  source: string
  sources?: { name: string; slug: string; id: string }[]
  altTitle?: string
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

function findMatchingKey(map: Map<string, ScrapedAnime>, title: string, altTitles?: string): string | undefined {
  const normalized = normalizeTitle(title)
  console.log(`[v0] findMatchingKey: trying to match "${title}" -> "${normalized}"`)
  
  let bestMatch: string | undefined
  let bestScore = 0
  const threshold = 0.8

  // Try matching with main title first
  for (const key of map.keys()) {
    const score = stringSimilarity(normalized, key)
    console.log(`[v0] findMatchingKey: main title "${normalized}" vs "${key}" = ${score}`)
    if (score > threshold && score > bestScore) {
      bestScore = score
      bestMatch = key
    }
  }

  // If no good match found and alt titles are available, try them
  if (!bestMatch && altTitles) {
    console.log(`[v0] findMatchingKey: no good match for main title, trying alt titles: "${altTitles}"`)
    // Split alt titles by common separators and try each
    const altTitleList = altTitles.split(/[,;;]/).map(t => t.trim()).filter(t => t.length > 0)
    console.log(`[v0] findMatchingKey: split alt titles:`, altTitleList)
    
    for (const altTitle of altTitleList) {
      const normalizedAlt = normalizeTitle(altTitle)
      console.log(`[v0] findMatchingKey: trying alt title "${altTitle}" -> "${normalizedAlt}"`)
      
      for (const key of map.keys()) {
        const score = stringSimilarity(normalizedAlt, key)
        console.log(`[v0] findMatchingKey: alt title "${normalizedAlt}" vs "${key}" = ${score}`)
        if (score > threshold && score > bestScore) {
          bestScore = score
          bestMatch = key
          console.log(`[v0] findMatchingKey: found better match with alt title: "${altTitle}" -> "${key}" (${score})`)
        }
      }
    }
  }

  console.log(`[v0] findMatchingKey: final result: ${bestMatch ? `"${bestMatch}" (${bestScore})` : 'no match'}`)
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
      const matchKey = findMatchingKey(map, normalizedTitle, anime.altTitle)

      if (matchKey) {
        const existing = map.get(matchKey)!
        if (!existing.poster && anime.poster) existing.poster = anime.poster
        if (!existing.description && anime.description) existing.description = anime.description
        if (!existing.altTitle && anime.altTitle) existing.altTitle = anime.altTitle

        if (!existing.sources) existing.sources = []
        for (const src of anime.sources ?? [{ name: anime.source, slug: anime.slug, id: anime.id }]) {
          if (!existing.sources.find((s) => s.id === src.id)) {
            existing.sources.push(src)
          }
        }
      } else {
        map.set(normalizedTitle, {
          ...anime,
          sources: anime.sources ?? [{ name: anime.source, slug: anime.slug, id: anime.id }],
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
        const title = nameEl.text().trim()
        const altTitle = nameEl.attr("data-jtitle")?.trim() || undefined
        if (!relativeUrl) return

        let animeId: string | null = null
        const pathParts = relativeUrl.replace(/^\/+|\/+$/g, "").split("/")
        if (pathParts.length >= 2 && pathParts[0] === "play") animeId = pathParts[1]
        else animeId = pathParts[pathParts.length - 1]

        const imgEl = $(el).find("img")
        let posterUrl = imgEl.attr("src")
        if (posterUrl && !posterUrl.startsWith("http")) posterUrl = new URL(posterUrl, this.BASE_URL).href

        if (animeId)
          results.push({ title, slug: animeId, id: animeId, poster: posterUrl, source: "AnimeWorld", altTitle })
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

        const titleLink = $(el).find("h3 a.badge-archivio")
        const animeUrl = titleLink.attr("href")
        const title = titleLink.text().trim()

        console.log(`[v0] AnimeSaturn item ${index + 1}: title="${title}", url="${animeUrl}"`)

        if (!animeUrl || !title) {
          console.log(`[v0] AnimeSaturn item ${index + 1}: skipping due to missing title or URL`)
          return
        }

        const fullAnimeUrl = animeUrl.startsWith("http") ? animeUrl : new URL(animeUrl, this.BASE_URL).href

        let animeSlug: string
        try {
          const urlPath = new URL(animeUrl, this.BASE_URL).pathname
          animeSlug = urlPath.replace("/anime/", "")
          console.log(`[v0] AnimeSaturn item ${index + 1}: extracted slug="${animeSlug}"`)
        } catch (e) {
          console.log(`[v0] AnimeSaturn item ${index + 1}: failed to extract slug from URL`)
          return
        }

        let poster = $(el).find("img.locandina-archivio").attr("src")
        if (poster && !poster.startsWith("http")) {
          poster = new URL(poster, this.BASE_URL).href
        }
        console.log(`[v0] AnimeSaturn item ${index + 1}: poster="${poster}"`)

        const description = $(el).find("p.trama-anime-archivio").text().trim() || undefined
        console.log(`[v0] AnimeSaturn item ${index + 1}: description length=${description?.length || 0}`)

        if (animeSlug) {
          const result = {
            title,
            slug: animeSlug,
            id: animeSlug,
            url: fullAnimeUrl,
            poster,
            description,
            source: "AnimeSaturn",
          }
          results.push(result)
          console.log(`[v0] AnimeSaturn item ${index + 1}: added to results with URL: ${fullAnimeUrl}`)
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
          embed: `<video 
  src="${mp4Url}" 
  class="w-full h-full" 
  controls 
  playsinline 
  preload="metadata" 
  autoplay>
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
 * Unity (AnimeUnity) Scraper
 * ------------------------- */
export class UnityScraper extends BaseScraper {
  private readonly API_BASE = "https://delicate-rubia-hachu-9b0ceeb1.koyeb.app"

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      console.log(`[v0] Unity search starting for query: "${query}"`)
      const url = `${this.API_BASE}/search?title=${encodeURIComponent(query)}`
      console.log(`[v0] Unity search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      console.log(`[v0] Unity search response: ${json.length} results`)

      if (!Array.isArray(json)) {
        console.log("[v0] Unity: response is not an array")
        return []
      }

      const results: ScrapedAnime[] = []

      for (const anime of json) {
        results.push({
          title: anime.title_en || anime.title_it || "Unknown",
          slug: anime.slug,
          id: String(anime.id),
          poster: anime.thumbnail,
          description: anime.plot || `${anime.type} - ${anime.status} - Score: ${anime.score}`,
          source: "Unity",
        })
      }

      console.log(`[v0] Unity search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] Unity search error:", err)
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      console.log(`[v0] Unity getEpisodes starting for ID: "${animeId}"`)
      const url = `${this.API_BASE}/episodes?anime_id=${animeId}`
      console.log(`[v0] Unity episodes URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      console.log(`[v0] Unity episodes response:`, json)

      if (!json.episodes || !Array.isArray(json.episodes)) {
        console.log("[v0] Unity: no episodes array found")
        return []
      }

      const episodes: ScrapedEpisode[] = []

      for (const ep of json.episodes) {
        const epNum = Number.parseInt(ep.number)
        if (!isNaN(epNum)) {
          episodes.push({
            episode_number: epNum,
            id: String(ep.episode_id),
            url: `${this.API_BASE}/embed?episode_id=${ep.episode_id}`,
          })
        }
      }

      const sortedEpisodes = episodes.sort((a, b) => a.episode_number - b.episode_number)
      console.log(`[v0] Unity getEpisodes completed: ${sortedEpisodes.length} episodes`)
      return sortedEpisodes
    } catch (err) {
      console.error("[v0] Unity episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string): Promise<ScrapedStream | null> {
    try {
      console.log(`[v0] Unity getStreamUrl starting for ID: "${episodeId}"`)

      // The stream URL is directly the embed endpoint with episode_id
      const streamUrl = `${this.API_BASE}/embed?episode_id=${episodeId}`
      console.log(`[v0] Unity stream URL: ${streamUrl}`)

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
        provider: "Unity",
      }
    } catch (err) {
      console.error("[v0] Unity stream error:", err)
      return null
    }
  }
}

/** -------------------------
 * AnimeGG Scraper
 * ------------------------- */
export class AnimeGGScraper extends BaseScraper {
  private readonly BASE_URL = "https://www.animegg.org"

  async search(query: string, isDub = false): Promise<ScrapedAnime[]> {
    try {
      console.log(`[v0] AnimeGG search starting for query: "${query}"`)
      const url = `${this.BASE_URL}/search/?q=${encodeURIComponent(query)}`
      console.log(`[v0] AnimeGG search URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      console.log(`[v0] AnimeGG search response status: ${res.status}`)
      console.log(`[v0] AnimeGG search response headers:`, Object.fromEntries(res.headers.entries()))
      
      if (!res.ok) {
        const errorBody = await res.text()
        console.error(`[v0] AnimeGG search HTTP error ${res.status}:`, errorBody.slice(0, 500))
        throw new Error(`HTTP ${res.status}`)
      }
      
      const html = await res.text()
      console.log(`[v0] AnimeGG search HTML length: ${html.length}`)
      console.log(`[v0] AnimeGG search HTML preview:`, html.slice(0, 1000))

      // Extract each anime item individually using a more flexible approach
      const itemRegex = /<a href="(\/series\/[^"]+)" class="mse">[\s\S]*?<\/a>/g
      const results: ScrapedAnime[] = []
      let match: RegExpExecArray | null

      // Test if there are any anchor tags with class mse at all
      const mseTest = html.match(/<a[^>]*class="mse"[^>]*>/g)
      console.log(`[v0] AnimeGG found ${mseTest?.length || 0} elements with class="mse"`)
      
      // Test for series links
      const seriesTest = html.match(/\/series\/[^"']+/g)
      console.log(`[v0] AnimeGG found ${seriesTest?.length || 0} series links:`, seriesTest?.slice(0, 5))

      while ((match = itemRegex.exec(html)) !== null) {
        const itemHtml = match[0]
        const relativeUrl = match[1]
        const id = relativeUrl.replace("/series/", "")
        
        // Extract title
        const titleMatch = itemHtml.match(/<h2>(.*?)<\/h2>/)
        const rawTitle = titleMatch ? titleMatch[1].trim() : ""
        
        // Extract thumbnail
        const thumbnailMatch = itemHtml.match(/<img src="([^"]+)"[^>]*class="media-object"/)
        const thumbnail = thumbnailMatch ? thumbnailMatch[1] : ""
        
        // Extract episodes
        const episodesMatch = itemHtml.match(/<div>Episodes:\s*(\d+)<\/div>/)
        const episodes = episodesMatch ? Number.parseInt(episodesMatch[1]) : 0
        
        // Extract alt titles (more flexible)
        let altTitles = ""
        const altTitlesMatch = itemHtml.match(/<div>Alt Titles\s*:\s*([^<]+)<\/div>/i)
        if (altTitlesMatch) {
          altTitles = altTitlesMatch[1].trim()
          console.log(`[v0] AnimeGG: extracted alt titles for "${rawTitle}": "${altTitles}"`)
        } else {
          console.log(`[v0] AnimeGG: no alt titles found for "${rawTitle}"`)
        }
        
        console.log(`[v0] AnimeGG match found: url=${relativeUrl}, title=${rawTitle}, episodes=${episodes}, thumbnail=${thumbnail}, altTitles=${altTitles}`)

        // Filter out results with 0 episodes
        if (episodes === 0) {
          console.log(`[v0] AnimeGG filtering out result with 0 episodes: ${rawTitle}`)
          continue
        }

        // Apply title normalizations
        let normalizedTitle = rawTitle
        
        // 1. Handle (Dub)/(ITA) matching - prioritize (Dub) to match with (ITA) results
        const isDubVersion = rawTitle.includes("(Dub)") || id.endsWith("-dub")
        if (isDubVersion) {
          // Remove (Dub) from title for better matching
          normalizedTitle = normalizedTitle.replace(/\s*\(Dub\)\s*/g, "").trim()
        }
        
        // 2. Season normalization: "Season x" or "x Season" -> just "x"
        normalizedTitle = normalizedTitle
          .replace(/\bSeason\s+(\d+)\b/gi, "$1") // "Season 2" -> "2"
          .replace(/\b(\d+)\s+Season\b/gi, "$1") // "2 Season" -> "2"
          .replace(/\b(\d+)(?:st|nd|rd|th)\s+Season\b/gi, "$1") // "2nd Season" -> "2"
          .replace(/\b(\d+)(?:st|nd|rd|th)\s+Season\b/gi, "$1") // "3rd Season" -> "3"

        // Ensure thumbnail is absolute URL
        let posterUrl = thumbnail
        if (posterUrl && !posterUrl.startsWith("http")) {
          posterUrl = new URL(posterUrl, this.BASE_URL).href
        }

        results.push({
          title: normalizedTitle,
          slug: id,
          id: id,
          url: `${this.BASE_URL}${relativeUrl}`,
          poster: posterUrl,
          source: "AnimeGG",
          altTitle: altTitles,
          description: isDub ? "Dub preferred" : "Sub preferred",
        })
      }

      console.log(`[v0] AnimeGG search completed: ${results.length} results`)
      return results
    } catch (err) {
      console.error("[v0] AnimeGG search error:", err)
      console.error("[v0] AnimeGG search error stack:", err instanceof Error ? err.stack : "no stack")
      return []
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      console.log(`[v0] AnimeGG getEpisodes starting for ID: "${animeId}"`)
      const url = `${this.BASE_URL}/series/${animeId}`
      console.log(`[v0] AnimeGG episodes URL: ${url}`)

      const res = await this.fetchWithTimeout(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      console.log(`[v0] AnimeGG episodes HTML length: ${html.length}`)

      const episodes: ScrapedEpisode[] = []

      // Regex to extract episode data
      const epRegex =
        /<a href="([^"]+)" class="anm_det_pop">[\s\S]*?<strong>(.*?)<\/strong>[\s\S]*?<i class="anititle">(.*?)<\/i>/g

      let match: RegExpExecArray | null
      while ((match = epRegex.exec(html)) !== null) {
        const href = match[1]
        const strongText = match[2]

        // Try to extract number from URL first (e.g. /sword-art-online-episode-25)
        const epNumStr = href.match(/-episode-(\d+)/)
        let epNum = epNumStr ? Number.parseInt(epNumStr[1]) : 0

        // Fallback: If URL doesn't have "-episode-", try extracting last number from strong tag
        if (!epNum) {
          const numMatch = strongText.match(/(\d+)$/)
          epNum = numMatch ? Number.parseInt(numMatch[1]) : 0
        }

        if (epNum > 0) {
          episodes.push({
            episode_number: epNum,
            id: href,
            url: `${this.BASE_URL}${href}`,
          })
        }
      }

      const sortedEpisodes = episodes.sort((a, b) => a.episode_number - b.episode_number)
      console.log(`[v0] AnimeGG getEpisodes completed: ${sortedEpisodes.length} episodes`)
      return sortedEpisodes
    } catch (err) {
      console.error("[v0] AnimeGG episodes error:", err)
      return []
    }
  }

  async getStreamUrl(episodeId: string, preferDub = false): Promise<ScrapedStream | null> {
    // This method is kept for backwards compatibility, returns the best quality for preferred server
    const allStreams = await this.getAllStreamUrls(episodeId)
    if (!allStreams) return null

    // Return the best quality from preferred server, fallback to any available
    const preferredServer = preferDub ? allStreams["GG-DUB"] : allStreams["GG-SUB"]
    const fallbackServer = preferDub ? allStreams["GG-SUB"] : allStreams["GG-DUB"]
    
    const serverData = preferredServer || fallbackServer
    if (!serverData || serverData.length === 0) return null

    // Get best quality
    const bestSource = serverData.reduce((prev, current) => {
      const prevQuality = Number.parseInt(prev.quality) || 0
      const currQuality = Number.parseInt(current.quality) || 0
      return currQuality > prevQuality ? current : prev
    })

    return {
      stream_url: bestSource.url,
      embed: `<video 
  src="${bestSource.url}" 
  class="w-full h-full" 
  controls 
  playsinline 
  preload="metadata" 
  autoplay>
</video>`,
      provider: preferredServer ? (preferDub ? "GG-DUB" : "GG-SUB") : (preferDub ? "GG-SUB" : "GG-DUB"),
    }
  }

  async getAllStreamUrls(episodeId: string): Promise<{
    "GG-SUB"?: { url: string; quality: string; type: string }[]
    "GG-DUB"?: { url: string; quality: string; type: string }[]
  } | null> {
    try {
      console.log(`[v0] AnimeGG getAllStreamUrls starting for ID: "${episodeId}"`)

      const episodeUrl = episodeId.startsWith("http") ? episodeId : `${this.BASE_URL}${episodeId}`
      console.log(`[v0] AnimeGG episode URL: ${episodeUrl}`)

      const res = await this.fetchWithTimeout(episodeUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      console.log(`[v0] AnimeGG episode HTML length: ${html.length}`)

      const result: {
        "GG-SUB"?: { url: string; quality: string; type: string }[]
        "GG-DUB"?: { url: string; quality: string; type: string }[]
      } = {}

      // Check for both subbed and dubbed servers
      const servers: { tabId: string; serverName: "GG-SUB" | "GG-DUB" }[] = [
        { tabId: "subbed-Animegg", serverName: "GG-SUB" },
        { tabId: "dubbed-Animegg", serverName: "GG-DUB" },
      ]

      for (const { tabId, serverName } of servers) {
        if (!html.includes(`id="${tabId}"`)) {
          console.log(`[v0] AnimeGG: ${serverName} server not found`)
          continue
        }

        const tabRegex = new RegExp(`<div id="${tabId}"[^>]*>\\s*<iframe src="(.*?)"`, "s")
        const iframeMatch = html.match(tabRegex)

        if (!iframeMatch) {
          console.log(`[v0] AnimeGG: Embed iframe not found for ${serverName}`)
          continue
        }

        const embedUrl = `${this.BASE_URL}${iframeMatch[1]}`
        console.log(`[v0] AnimeGG ${serverName} embed URL: ${embedUrl}`)

        try {
          const embedRes = await this.fetchWithTimeout(embedUrl)
          if (!embedRes.ok) {
            console.log(`[v0] AnimeGG: Failed to fetch embed for ${serverName}: HTTP ${embedRes.status}`)
            continue
          }
          const embedHtml = await embedRes.text()
          console.log(`[v0] AnimeGG ${serverName} embed HTML length: ${embedHtml.length}`)

          // Extract the JS array definition
          const sourceMatch = embedHtml.match(/var\s+videoSources\s*=\s*(\[[\s\S]*?\])/)
          if (!sourceMatch) {
            console.log(`[v0] AnimeGG: Video sources variable not found for ${serverName}`)
            continue
          }

          const rawSourceStr = sourceMatch[1]
          const parsedSources: { url: string; quality: string; type: string }[] = []

          // Regex to extract attributes from the unquoted JS objects
          const objRegex = /{.*?file:\s*"(.*?)".*?label:\s*"(.*?)".*?}/g

          let objMatch: RegExpExecArray | null
          while ((objMatch = objRegex.exec(rawSourceStr)) !== null) {
            const videoUrl = `${this.BASE_URL}${objMatch[1]}`
            parsedSources.push({
              url: videoUrl,
              quality: objMatch[2],
              type: "mp4",
            })
          }

          if (parsedSources.length > 0) {
            // Sort by quality (highest first)
            parsedSources.sort((a, b) => {
              const aQuality = Number.parseInt(a.quality) || 0
              const bQuality = Number.parseInt(b.quality) || 0
              return bQuality - aQuality
            })
            result[serverName] = parsedSources
            console.log(`[v0] AnimeGG found ${parsedSources.length} sources for ${serverName}:`, parsedSources.map(s => s.quality))
          }
        } catch (embedErr) {
          console.error(`[v0] AnimeGG embed fetch error for ${serverName}:`, embedErr)
        }
      }

      if (Object.keys(result).length === 0) {
        console.log("[v0] AnimeGG: No streams found for any server")
        return null
      }

      console.log(`[v0] AnimeGG getAllStreamUrls completed:`, Object.keys(result))
      return result
    } catch (err) {
      console.error("[v0] AnimeGG getAllStreamUrls error:", err)
      return null
    }
  }
}

export async function searchAnime(query: string): Promise<ScrapedAnime[]> {
  const awScraper = new AnimeWorldScraper()
  const asScraper = new AnimeSaturnScraper()
  const auScraper = new UnityScraper()
  const agScraper = new AnimeGGScraper()
  const [awResults, asResults, auResults, agResults] = await Promise.all([
    awScraper.search(query),
    asScraper.search(query),
    auScraper.search(query),
    agScraper.search(query),
  ])
  return aggregateAnime([awResults, asResults, auResults, agResults])
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
    } else if (src.name === "Unity") {
      const scraper = new UnityScraper()
      eps = await scraper.getEpisodes(src.id)
    } else if (src.name === "AnimeGG") {
      const scraper = new AnimeGGScraper()
      eps = await scraper.getEpisodes(src.id)
    }
    episodesList.push(eps)
  }
  return aggregateEpisodes(episodesList)
}
