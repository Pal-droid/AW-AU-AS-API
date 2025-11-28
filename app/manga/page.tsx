import Link from "next/link"
import { MangaHero } from "@/components/manga-hero"
import { LatestMangaChapters } from "@/components/latest-manga-chapters"
import { MangaGenres } from "@/components/manga-genres"
import { TrendingChapters } from "@/components/trending-chapters"
import { MangaOfMonth } from "@/components/manga-of-month"
import { LatestMangaAdditions } from "@/components/latest-manga-additions"
import { ContinueReading } from "@/components/continue-reading"
import { SlideOutMenu } from "@/components/slide-out-menu"

export default function MangaPage() {
  console.log("[v0] Manga homepage is loading")

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/manga" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <MangaHero />

        <ContinueReading />

        <TrendingChapters />

        <LatestMangaChapters />

        <div className="grid md:grid-cols-2 gap-6">
          <MangaOfMonth />
          <LatestMangaAdditions />
        </div>

        <MangaGenres />
      </section>
    </main>
  )
}
