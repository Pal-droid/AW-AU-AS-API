import * as cheerio from "cheerio";
import stringSimilarity from "string-similarity";

export interface ScrapedAnime {
  title: string;
  url: string;
  id: string;
  poster?: string;
  description?: string;
  source: string;
  sources?: { name: string; url: string; id: string }[];
}

export interface ScrapedEpisode {
  episode_number: number;
  id: string;
  url: string;
}

export interface ScrapedStream {
  stream_url?: string;
  embed?: string;
  provider?: string;
}

/** -------------------------
 * Base Scraper
 * ------------------------- */
class BaseScraper {
  protected timeout = 30000;
  protected headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  protected async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = { headers: this.headers, signal: controller.signal };

      if (typeof process !== "undefined" && process.env.NODE_ENV) {
        const https = await import("https");
        const agent = new https.Agent({ rejectUnauthorized: false });
        // @ts-ignore
        fetchOptions.agent = agent;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/** -------------------------
 * Normalization & Matching
 * ------------------------- */
export function normalizeTitle(title: string): string {
  // A more robust normalization function
  return title
    .toLowerCase()
    .replace(/$$ita$$/g, "") // remove (ITA) tag
    .replace(/[^\w\s]/g, " ") // replace all non-alphanumeric characters with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}

function findMatchingKey(map: Map<string, ScrapedAnime>, title: string): string | undefined {
  const normalized = normalizeTitle(title);
  let bestMatch: string | undefined;
  let bestScore = 0;

  // The similarity score of 0.85 was a bit too high and brittle.
  // We'll use a lower, more flexible score and find the best match.
  const threshold = 0.7;

  for (const key of map.keys()) {
    const score = stringSimilarity.compareTwoStrings(normalized, key);
    if (score > threshold && score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }

  return bestMatch;
}

/** -------------------------
 * Aggregation
 * ------------------------- */
export function aggregateAnime(results: ScrapedAnime[][]): ScrapedAnime[] {
  const map = new Map<string, ScrapedAnime>();

  for (const sourceResults of results) {
    for (const anime of sourceResults) {
      const normalizedTitle = normalizeTitle(anime.title);
      const matchKey = findMatchingKey(map, normalizedTitle);

      if (matchKey) {
        const existing = map.get(matchKey)!;
        // Merge missing data
        if (!existing.poster && anime.poster) existing.poster = anime.poster;
        if (!existing.description && anime.description) existing.description = anime.description;

        // Aggregate sources
        if (!existing.sources) existing.sources = [];
        for (const src of anime.sources ?? [{ name: anime.source, url: anime.url, id: anime.id }]) {
          if (!existing.sources.find((s) => s.id === src.id)) {
            existing.sources.push(src);
          }
        }
      } else {
        // Add new entry
        map.set(normalizedTitle, {
          ...anime,
          sources: anime.sources ?? [{ name: anime.source, url: anime.url, id: anime.id }],
        });
      }
    }
  }
  return Array.from(map.values());
}

export function aggregateEpisodes(allEpisodes: ScrapedEpisode[][]): ScrapedEpisode[] {
  const map = new Map<number, ScrapedEpisode>();
  for (const episodes of allEpisodes) {
    for (const ep of episodes) {
      if (!map.has(ep.episode_number)) map.set(ep.episode_number, ep);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.episode_number - b.episode_number);
}

/** -------------------------
 * AnimeWorld Scraper
 * ------------------------- */
export class AnimeWorldScraper extends BaseScraper {
  private readonly BASE_URL = "https://www.animeworld.ac";

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      const url = `${this.BASE_URL}/search?keyword=${encodeURIComponent(query)}`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: ScrapedAnime[] = [];

      $(".film-list .item").each((_, el) => {
        const nameEl = $(el).find("a.name");
        if (!nameEl.length) return;
        const relativeUrl = nameEl.attr("href");
        const title = nameEl.attr("data-jtitle") || nameEl.text().trim();
        if (!relativeUrl) return;

        const fullUrl = new URL(relativeUrl, this.BASE_URL).href;

        let animeId: string | null = null;
        const pathParts = relativeUrl.replace(/^\/+|\/+$/g, "").split("/");
        if (pathParts.length >= 2 && pathParts[0] === "play") animeId = pathParts[1];
        else animeId = pathParts[pathParts.length - 1];

        const imgEl = $(el).find("img");
        let posterUrl = imgEl.attr("src");
        if (posterUrl && !posterUrl.startsWith("http")) posterUrl = new URL(posterUrl, this.BASE_URL).href;

        if (animeId) results.push({ title, url: fullUrl, id: animeId, poster: posterUrl, source: "AnimeWorld" });
      });

      return results;
    } catch (err) {
      console.error("AnimeWorld search error:", err);
      return [];
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      const url = `${this.BASE_URL}/play/${animeId}`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);
      const episodes: ScrapedEpisode[] = [];

      $("div.server ul.episodes li.episode a").each((_, el) => {
        const $el = $(el);
        const num = Number.parseInt($el.attr("data-episode-num") || "");
        const epId = $el.attr("data-id");
        const epUrl = $el.attr("href");
        if (num && epId && epUrl)
          episodes.push({ episode_number: num, id: `${animeId}/${epId}`, url: new URL(epUrl, this.BASE_URL).href });
      });

      return episodes.sort((a, b) => a.episode_number - b.episode_number);
    } catch (err) {
      console.error("AnimeWorld episodes error:", err);
      return [];
    }
  }

  async getStreamUrl(episodeId: string): Promise<string | null> {
    try {
      const url = episodeId.includes("/")
        ? `${this.BASE_URL}/play/${episodeId}`
        : `${this.BASE_URL}/play/episode/${episodeId}`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      return (
        $("#alternativeDownloadLink").attr("href") ||
        $("#downloadLink").attr("href") ||
        $("#customDownloadButton").attr("href") ||
        $("video, iframe").first().attr("src") ||
        null
      );
    } catch (err) {
      console.error("AnimeWorld stream error:", err);
      return null;
    }
  }
}

/** -------------------------
 * AnimeSaturn Scraper
 * ------------------------- */
export class AnimeSaturnScraper extends BaseScraper {
  private readonly BASE_URL = "https://www.animesaturn.cx";

  async search(query: string): Promise<ScrapedAnime[]> {
    try {
      const url = `${this.BASE_URL}/animelist?search=${encodeURIComponent(query)}`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const html = await res.text();
      const results: ScrapedAnime[] = [];

      const $ = cheerio.load(html);
      $(".list-group-item").each((_, el) => {
        const titleLink = $(el).find("h3 a.badge-archivio");
        const animeUrl = titleLink.attr("href");
        const title = titleLink.text().trim();

        if (!animeUrl || !title) {
          console.warn("Skipping item: Missing URL or title", $(el).html());
          return;
        }

        let animeId: string | null = null;
        try {
          animeId = new URL(animeUrl, this.BASE_URL).pathname.split("/").filter(Boolean)[1];
        } catch (e) {
          console.warn(`Failed to parse anime ID from URL: ${animeUrl}`, e);
          return;
        }
        if (!animeId) {
          console.warn(`No anime ID found for URL: ${animeUrl}`);
          return;
        }

        let poster = $(el).find(".copertina-archivio").attr("src");
        if (poster && !poster.startsWith("http")) {
          poster = new URL(poster, this.BASE_URL).href;
        }

        const description = $(el).find(".trama-anime-archivio").text().trim() || undefined;

        results.push({
          title,
          url: animeUrl,
          id: animeId,
          poster,
          description,
          source: "AnimeSaturn",
        });
      });

      return results;
    } catch (err) {
      console.error("AnimeSaturn search error:", err);
      return [];
    }
  }

  async getEpisodes(animeId: string): Promise<ScrapedEpisode[]> {
    try {
      const url = `${this.BASE_URL}/anime/${animeId}`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const html = await res.text();
      const $ = cheerio.load(html);
      const episodes: ScrapedEpisode[] = [];

      $("div.episodi-link-button > a").each((_, el) => {
        const epUrl = $(el).attr("href");
        const epText = $(el).text().trim();
        const match = epText.match(/Episodio\s+(\d+)/i);
        if (!epUrl || !match) return;
        const num = Number.parseInt(match[1]);
        const epId = epUrl.replace(/\/+$/, "").split("/").pop()!;
        episodes.push({
          episode_number: num,
          id: epId,
          url: epUrl.startsWith("http") ? epUrl : new URL(epUrl, this.BASE_URL).href,
        });
      });

      return episodes.sort((a, b) => a.episode_number - b.episode_number);
    } catch (err) {
      console.error("AnimeSaturn episodes error:", err);
      return [];
    }
  }

  async getStreamUrl(episodeId: string): Promise<string | null> {
    try {
      const episodeUrl = `${this.BASE_URL}/ep/${episodeId}`;
      console.log("[v0] AnimeSaturn: Fetching episode page:", episodeUrl);

      const res = await this.fetchWithTimeout(episodeUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      let streamingLink = null;

      // Try multiple selectors for the streaming button
      const streamingSelectors = [
        'a:contains("Guarda lo streaming")',
        'a[href*="/watch"]',
        '.btn:contains("Guarda")',
        'a[href*="file="]',
        '.btn-light:contains("streaming")',
      ];

      for (const selector of streamingSelectors) {
        const element = $(selector);
        streamingLink = element.attr("href") || element.closest("a").attr("href");
        if (streamingLink) {
          console.log("[v0] AnimeSaturn: Found streaming link with selector:", selector);
          break;
        }
      }

      if (!streamingLink) {
        console.log("[v0] AnimeSaturn: No streaming link found on page");
        console.log(
          "[v0] AnimeSaturn: Available links:",
          $("a")
            .map((_, el) => $(el).attr("href"))
            .get()
        );
        console.log(
          "[v0] AnimeSaturn: Available buttons:",
          $(".btn")
            .map((_, el) => $(el).text().trim())
            .get()
        );
        return null;
      }

      const fullStreamingUrl = streamingLink.startsWith("http")
        ? streamingLink
        : new URL(streamingLink, this.BASE_URL).href;
      console.log("[v0] AnimeSaturn: Following streaming link:", fullStreamingUrl);

      // Follow the streaming link to get the actual video page
      const streamRes = await this.fetchWithTimeout(fullStreamingUrl);
      if (!streamRes.ok) throw new Error(`HTTP ${streamRes.status}`);
      const streamHtml = await streamRes.text();
      const $stream = cheerio.load(streamHtml);

      let videoSrc = null;

      console.log("[v0] AnimeSaturn: Looking for MP4 sources first");
      const mp4Selectors = [
        "#video-player video source[src*='.mp4']",
        "#video-player source[src*='.mp4']",
        "video.afterglow source[src*='.mp4']",
        "#myvideo source[src*='.mp4']",
        'source[type="video/mp4"][src]',
        'video source[src*=".mp4"]',
        'source[src*=".mp4"]',
        "#video-player video source[src]",
        "video.afterglow source[src]",
        "#myvideo source[src]",
        "video source[src]",
        "source[src]",
      ];

      for (const selector of mp4Selectors) {
        const element = $stream(selector).first();
        const src = element.attr("src");
        if (src && src.includes(".mp4")) {
          console.log("[v0] AnimeSaturn: Found MP4 source with selector:", selector, "->", src);
          videoSrc = src;
          break;
        }
      }

      if (!videoSrc) {
        console.log("[v0] AnimeSaturn: No MP4 found, trying alternative player");

        // First try to find alternative player button
        const altPlayerDiv = $stream("div#wtf.button");
        if (altPlayerDiv.length > 0) {
          const altPlayerLink = altPlayerDiv.find("a").attr("href");
          if (altPlayerLink) {
            console.log("[v0] AnimeSaturn: Found alternative player link:", altPlayerLink);

            // Follow the alternative player link
            const altPlayerUrl = altPlayerLink.startsWith("http")
              ? altPlayerLink
              : new URL(altPlayerLink, this.BASE_URL).href;

            try {
              const altRes = await this.fetchWithTimeout(altPlayerUrl);
              if (altRes.ok) {
                const altHtml = await altRes.text();
                const $alt = cheerio.load(altHtml);

                // Look for video with id="player-v" and m3u8 source
                const playerVideo = $alt("video#player-v");
                if (playerVideo.length > 0) {
                  const m3u8Source = playerVideo.find('source[src*=".m3u8"]').attr("src");
                  if (m3u8Source) {
                    console.log("[v0] AnimeSaturn: Found m3u8 URL in alternative player:", m3u8Source);
                    return m3u8Source.startsWith("http") ? m3u8Source : new URL(m3u8Source, this.BASE_URL).href;
                  }
                }
              }
            } catch (altError) {
              console.log("[v0] AnimeSaturn: Error fetching alternative player:", altError);
            }
          }
        }

        // If alternative player didn't work, try direct m3u8 search in current page
        console.log("[v0] AnimeSaturn: Trying direct m3u8 search");
        const playerVideo = $stream("video#player-v");
        if (playerVideo.length > 0) {
          const m3u8Source = playerVideo.find('source[src*=".m3u8"]').attr("src");
          if (m3u8Source) {
            console.log("[v0] AnimeSaturn: Found m3u8 URL in player-v:", m3u8Source);
            return m3u8Source.startsWith("http") ? m3u8Source : new URL(m3u8Source, this.BASE_URL).href;
          }
        }
      }

      if (!videoSrc) {
        console.log("[v0] AnimeSaturn: No video source found");
        console.log("[v0] AnimeSaturn: Page title:", $stream("title").text());
        console.log("[v0] AnimeSaturn: Video elements found:", $stream("video").length);
        console.log("[v0] AnimeSaturn: Source elements found:", $stream("source").length);
        console.log("[v0] AnimeSaturn: Script tags found:", $stream("script").length);
        return null;
      }

      const finalUrl = videoSrc.startsWith("http") ? videoSrc : new URL(videoSrc, this.BASE_URL).href;
      console.log("[v0] AnimeSaturn: Final video source:", finalUrl);
      return finalUrl;
    } catch (err) {
      console.error("AnimeSaturn stream error:", err);
      return null;
    }
  }
}

/** -------------------------
 * Aggregated Search & Episodes
 * ------------------------- */
export async function searchAnime(query: string): Promise<ScrapedAnime[]> {
  const awScraper = new AnimeWorldScraper();
  const asScraper = new AnimeSaturnScraper();

  const [awResults, asResults] = await Promise.all([awScraper.search(query), asScraper.search(query)]);
  return aggregateAnime([awResults, asResults]);
}

export async function getAllEpisodes(anime: ScrapedAnime): Promise<ScrapedEpisode[]> {
  const episodesList: ScrapedEpisode[][] = [];

  for (const src of anime.sources ?? []) {
    let eps: ScrapedEpisode[] = [];
    if (src.name === "AnimeWorld") {
      const scraper = new AnimeWorldScraper();
      eps = await scraper.getEpisodes(src.id);
    } else if (src.name === "AnimeSaturn") {
      const scraper = new AnimeSaturnScraper();
      eps = await scraper.getEpisodes(src.id);
    }
    episodesList.push(eps);
  }

  return aggregateEpisodes(episodesList);
}

/** -------------------------
 * Example Usage
 * ------------------------- */
async function example() {
  const results = await searchAnime("Naruto Shippuden");
  console.log("Merged search results:", results);

  if (results.length > 0) {
    const episodes = await getAllEpisodes(results[0]);
    console.log(`Episodes for ${results[0].title}:`, episodes);
  }
}

// Uncomment to test
// example()