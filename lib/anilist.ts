/**
 * AniList API integration for improved anime matching
 * Implements queue system, rate limiting, and fallback logic
 */

export interface AniListAnime {
  id: number
  title: {
    romaji: string | null
    english: string | null
    native: string | null
  }
  synonyms: string[]
}

export interface AniListSearchResult {
  query: string
  anime: AniListAnime | null
  error?: string
}

// Queue system for managing concurrent searches
interface QueuedSearch {
  query: string
  resolve: (result: AniListSearchResult) => void
  reject: (error: Error) => void
}

class AniListService {
  private static instance: AniListService
  private queue: QueuedSearch[] = []
  private isProcessing = false
  private isRateLimited = false
  private cache = new Map<string, AniListSearchResult>()
  private rateLimitResetTime = 0

  private constructor() {}

  static getInstance(): AniListService {
    if (!AniListService.instance) {
      AniListService.instance = new AniListService()
    }
    return AniListService.instance
  }

  /**
   * Check if we're currently rate limited
   */
  isCurrentlyRateLimited(): boolean {
    if (this.isRateLimited && Date.now() < this.rateLimitResetTime) {
      return true
    }
    if (this.isRateLimited && Date.now() >= this.rateLimitResetTime) {
      this.isRateLimited = false
    }
    return false
  }

  /**
   * Random delay between 1-2 seconds
   */
  private async randomDelay(): Promise<void> {
    const delay = 1000 + Math.random() * 1000 // 1000-2000ms
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  /**
   * Search AniList API for an anime by title
   */
  private async searchAniList(query: string): Promise<AniListSearchResult> {
    // Check cache first
    const normalizedQuery = query.toLowerCase().trim()
    if (this.cache.has(normalizedQuery)) {
      console.log(`[AniList] Cache hit for: "${query}"`)
      return this.cache.get(normalizedQuery)!
    }

    const graphqlQuery = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          synonyms
        }
      }
    `

    try {
      console.log(`[AniList] Searching for: "${query}"`)

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: query },
        }),
      })

      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const resetTime = retryAfter ? Number.parseInt(retryAfter) * 1000 : 60000
        this.isRateLimited = true
        this.rateLimitResetTime = Date.now() + resetTime
        console.log(`[AniList] Rate limited! Will retry after ${resetTime}ms`)

        return {
          query,
          anime: null,
          error: "RATE_LIMITED",
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.errors) {
        // Handle "not found" gracefully
        if (data.errors.some((e: any) => e.message?.includes("Not Found"))) {
          const result: AniListSearchResult = { query, anime: null }
          this.cache.set(normalizedQuery, result)
          return result
        }
        throw new Error(data.errors[0]?.message || "AniList API error")
      }

      const anime = data.data?.Media as AniListAnime | null
      const result: AniListSearchResult = { query, anime }
      this.cache.set(normalizedQuery, result)

      console.log(`[AniList] Found: ${anime?.title?.romaji || anime?.title?.english || "null"} for "${query}"`)

      return result
    } catch (error) {
      console.error(`[AniList] Error searching for "${query}":`, error)
      return {
        query,
        anime: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Process the queue one item at a time with delays
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      // Check if we're rate limited
      if (this.isCurrentlyRateLimited()) {
        console.log("[AniList] Rate limited, rejecting remaining queue items")
        // Reject all remaining items in queue with rate limit error
        while (this.queue.length > 0) {
          const item = this.queue.shift()!
          item.resolve({ query: item.query, anime: null, error: "RATE_LIMITED" })
        }
        break
      }

      const item = this.queue.shift()!

      try {
        const result = await this.searchAniList(item.query)
        item.resolve(result)

        // If we got rate limited during this request, don't delay
        if (result.error === "RATE_LIMITED") {
          continue
        }

        // Random delay before next request (only if more items in queue)
        if (this.queue.length > 0) {
          await this.randomDelay()
        }
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    this.isProcessing = false
  }

  /**
   * Add a search to the queue
   */
  search(query: string): Promise<AniListSearchResult> {
    return new Promise((resolve, reject) => {
      // Check cache first (synchronously)
      const normalizedQuery = query.toLowerCase().trim()
      if (this.cache.has(normalizedQuery)) {
        resolve(this.cache.get(normalizedQuery)!)
        return
      }

      // If rate limited, return immediately
      if (this.isCurrentlyRateLimited()) {
        resolve({ query, anime: null, error: "RATE_LIMITED" })
        return
      }

      this.queue.push({ query, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Batch search multiple titles
   */
  async batchSearch(queries: string[]): Promise<Map<string, AniListSearchResult>> {
    const results = new Map<string, AniListSearchResult>()
    const uniqueQueries = [...new Set(queries.map((q) => q.toLowerCase().trim()))]

    for (const query of uniqueQueries) {
      const result = await this.search(query)
      results.set(query, result)

      // Stop if we hit rate limit
      if (result.error === "RATE_LIMITED") {
        console.log("[AniList] Rate limit hit during batch search, stopping")
        break
      }
    }

    return results
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export const anilistService = AniListService.getInstance()
