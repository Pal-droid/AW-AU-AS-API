import { NextResponse } from "next/server"
import { ComixScraper, MangaWorldScraper, type ScrapedChapter } from "@/lib/manga-scrapers"

interface ChapterSource {
  available: boolean
  id?: string
  url?: string
  title?: string
  date?: string
}

interface ChapterResult {
  chapter_number: number
  sources: Record<string, ChapterSource>
}

export async function GET(request: Request) {
  try {
    console.log("[v0] Manga chapters endpoint called")

    const url = new URL(request.url)

    // Comix parameters
    const comixHashId = url.searchParams.get("CX") // Comix hash_id

    // MangaWorld parameters
    const worldId = url.searchParams.get("MW") // MangaWorld manga_id
    const worldSlug = url.searchParams.get("MW_SLUG") // MangaWorld slug

    if (!comixHashId && !worldId) {
      return NextResponse.json(
        {
          error: "At least one source parameter is required",
          usage: "Example: /api/manga/chapters?CX=r67xv or /api/manga/chapters?MW=678&MW_SLUG=toukyou-ghoul",
          parameters: {
            CX: "Comix hash_id (e.g., r67xv)",
            MW: "MangaWorld manga_id (e.g., 678)",
            MW_SLUG: "MangaWorld slug (required with MW)",
          },
        },
        { status: 400 },
      )
    }

    const episodePromises: Promise<{ source: string; chapters: ScrapedChapter[] }>[] = []

    // Comix chapters
    if (comixHashId) {
      const comixScraper = new ComixScraper()
      episodePromises.push(comixScraper.getChapters(comixHashId).then((chapters) => ({ source: "Comix", chapters })))
    }

    // MangaWorld chapters
    if (worldId && worldSlug) {
      const worldScraper = new MangaWorldScraper()
      episodePromises.push(
        worldScraper.getChapters(worldId, worldSlug).then((chapters) => ({ source: "World", chapters })),
      )
    }

    const results = await Promise.allSettled(episodePromises)

    // Build chapter map
    const chapterMap = new Map<number, ChapterResult>()

    for (const result of results) {
      if (result.status !== "fulfilled") continue
      const { source, chapters } = result.value

      for (const ch of chapters) {
        if (!chapterMap.has(ch.chapter_number)) {
          chapterMap.set(ch.chapter_number, {
            chapter_number: ch.chapter_number,
            sources: {},
          })
        }

        const entry = chapterMap.get(ch.chapter_number)!
        entry.sources[source] = {
          available: true,
          id: ch.id,
          url: ch.url,
          title: ch.title,
          date: ch.date,
        }
      }
    }

    // Add unavailable markers for missing sources
    const allSources = ["Comix", "World"]
    for (const [, entry] of chapterMap) {
      for (const source of allSources) {
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
