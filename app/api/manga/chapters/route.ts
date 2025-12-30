import { NextResponse } from "next/server"
import { ComixScraper, MangaWorldScraper, type ScrapedChapter } from "@/lib/manga-scrapers"
import { getQueryParams } from "@/lib/query-utils"

interface ChapterSource {
  available: boolean
  id?: string
  url?: string
  title?: string
  date?: string
  hash_id?: string
  slug?: string
}

interface ChapterResult {
  chapter_number: number
  sources: Record<string, ChapterSource>
}

export async function GET(request: Request) {
  try {
    console.log("[v0] Manga chapters endpoint called")

    const searchParams = getQueryParams(request)

    // Comix parameters
    const comixHashId = searchParams.get("CX")
    const comixSlug = searchParams.get("CX_SLUG")

    // MangaWorld parameters
    const worldId = searchParams.get("MW")
    const worldSlug = searchParams.get("MW_SLUG")

    console.log(
      `[v0] Manga chapters params - CX: ${comixHashId}, CX_SLUG: ${comixSlug}, MW: ${worldId}, MW_SLUG: ${worldSlug}`,
    )

    if (!comixHashId && !worldId) {
      return NextResponse.json(
        {
          error: "At least one source parameter is required",
          usage:
            "Example: /api/manga/chapters?CX=r67xv&CX_SLUG=tonikaku-kawaii or /api/manga/chapters?MW=678&MW_SLUG=toukyou-ghoul",
          parameters: {
            CX: "Comix hash_id (e.g., r67xv)",
            CX_SLUG: "Comix slug (optional, passed through for pages endpoint)",
            MW: "MangaWorld manga_id (e.g., 678)",
            MW_SLUG: "MangaWorld slug (required with MW)",
          },
        },
        { status: 400 },
      )
    }

    let comixChapters: ScrapedChapter[] = []
    let worldChapters: ScrapedChapter[] = []

    // Fetch both sources in parallel but handle errors independently
    const promises: Promise<void>[] = []

    if (comixHashId) {
      promises.push(
        (async () => {
          try {
            const comixScraper = new ComixScraper()
            comixChapters = await comixScraper.getChapters(comixHashId)
          } catch (err) {
            console.error("[v0] Comix chapters fetch failed:", err)
          }
        })(),
      )
    }

    if (worldId && worldSlug) {
      promises.push(
        (async () => {
          try {
            const worldScraper = new MangaWorldScraper()
            worldChapters = await worldScraper.getChapters(worldId, worldSlug)
          } catch (err) {
            console.error("[v0] MangaWorld chapters fetch failed:", err)
          }
        })(),
      )
    }

    await Promise.all(promises)

    // Build chapter map
    const chapterMap = new Map<number, ChapterResult>()

    // Process Comix chapters
    for (const ch of comixChapters) {
      if (!chapterMap.has(ch.chapter_number)) {
        chapterMap.set(ch.chapter_number, {
          chapter_number: ch.chapter_number,
          sources: {},
        })
      }

      const entry = chapterMap.get(ch.chapter_number)!
      entry.sources["Comix"] = {
        available: true,
        id: ch.id,
        url: ch.url,
        title: ch.title,
        date: ch.date,
        hash_id: comixHashId || undefined,
        slug: comixSlug || undefined,
      }
    }

    // Process World chapters
    for (const ch of worldChapters) {
      if (!chapterMap.has(ch.chapter_number)) {
        chapterMap.set(ch.chapter_number, {
          chapter_number: ch.chapter_number,
          sources: {},
        })
      }

      const entry = chapterMap.get(ch.chapter_number)!
      entry.sources["World"] = {
        available: true,
        id: ch.id,
        url: ch.url,
        title: ch.title,
        date: ch.date,
      }
    }

    // Add unavailable markers for missing sources
    const requestedSources: string[] = []
    if (comixHashId) requestedSources.push("Comix")
    if (worldId && worldSlug) requestedSources.push("World")

    for (const [, entry] of chapterMap) {
      for (const source of requestedSources) {
        if (!entry.sources[source]) {
          entry.sources[source] = { available: false }
        }
      }
    }

    const sortedChapters = Array.from(chapterMap.values()).sort((a, b) => a.chapter_number - b.chapter_number)

    console.log(`[v0] Manga chapters completed: ${sortedChapters.length} chapters`)

    return NextResponse.json(sortedChapters, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    })
  } catch (error) {
    console.error(`[v0] Exception in manga chapters endpoint:`, error)
    return NextResponse.json(
      {
        error: "Manga chapters failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
