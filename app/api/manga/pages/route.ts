import { NextResponse } from "next/server"
import { ComixScraper, MangaWorldScraper, type ScrapedPage } from "@/lib/manga-scrapers"

interface PageResult {
  source: string
  pages: ScrapedPage[]
}

export async function GET(request: Request) {
  try {
    console.log("[v0] Manga pages endpoint called")

    const url = new URL(request.url)

    // Comix parameters
    const comixHashId = url.searchParams.get("CX_HASH") // hash_id
    const comixSlug = url.searchParams.get("CX_SLUG") // slug
    const comixChapterId = url.searchParams.get("CX_CHAPTER") // chapter_id
    const comixChapterNum = url.searchParams.get("CX_NUM") // chapter number

    // MangaWorld parameters
    const worldChapterUrl = url.searchParams.get("MW") // Full chapter URL

    if (!worldChapterUrl && !(comixHashId && comixSlug && comixChapterId && comixChapterNum)) {
      return NextResponse.json(
        {
          error: "Source parameters are required",
          usage: {
            comix: "/api/manga/pages?CX_HASH=r67xv&CX_SLUG=tonikaku-kawaii&CX_CHAPTER=6289759&CX_NUM=331",
            world:
              "/api/manga/pages?MW=https://www.mangaworld.mx/manga/678/toukyou-ghoul/read/5f77d62215ab860853c04b6f",
          },
          parameters: {
            CX_HASH: "Comix hash_id",
            CX_SLUG: "Comix manga slug",
            CX_CHAPTER: "Comix chapter_id",
            CX_NUM: "Comix chapter number",
            MW: "MangaWorld full chapter URL",
          },
        },
        { status: 400 },
      )
    }

    const results: PageResult[] = []

    // Comix pages
    if (comixHashId && comixSlug && comixChapterId && comixChapterNum) {
      try {
        const comixScraper = new ComixScraper()
        const pages = await comixScraper.getPages(
          comixHashId,
          comixSlug,
          comixChapterId,
          Number.parseInt(comixChapterNum),
        )
        results.push({ source: "Comix", pages })
      } catch (err) {
        console.error("[v0] Comix pages error:", err)
        results.push({ source: "Comix", pages: [] })
      }
    }

    // MangaWorld pages
    if (worldChapterUrl) {
      try {
        const worldScraper = new MangaWorldScraper()
        const pages = await worldScraper.getPages(worldChapterUrl)
        results.push({ source: "World", pages })
      } catch (err) {
        console.error("[v0] MangaWorld pages error:", err)
        results.push({ source: "World", pages: [] })
      }
    }

    // Return first successful result or combined
    const response = results.length === 1 ? results[0] : { sources: results }

    console.log(`[v0] Manga pages completed`)

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    console.error(`[v0] Exception in manga pages endpoint:`, error)
    return NextResponse.json(
      {
        error: "Manga pages failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
