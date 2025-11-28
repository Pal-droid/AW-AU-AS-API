"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { obfuscateId } from "@/lib/utils"
import { useState, useEffect } from "react"

interface MangaChapter {
  id: string
  title: string
  image: string
  type: string
  status: string
  chapters: {
    title: string
    url: string
    isNew?: boolean
    date?: string
  }[]
}

export function LatestMangaChapters() {
  const [latestData, setLatestData] = useState<MangaChapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLatestChapters = async () => {
      try {
        console.log("[v0] Fetching latest manga chapters...")
        const response = await fetch("/api/latest-manga-chapters")
        const data = await response.json()

        if (data.ok && data.chapters) {
          console.log("[v0] Loaded", data.chapters.length, "latest chapters")
          setLatestData(data.chapters)
        } else {
          console.error("[v0] Failed to load latest chapters:", data.error)
          setLatestData([
            {
              id: "2237",
              title: "Baby Steps",
              image: "https://cdn.mangaworld.cx/volumes/68a47884d5b1a421154b703e.png?1755609318469",
              type: "Manga",
              status: "In corso",
              chapters: [
                { title: "Vol. 41 - Capitolo 387", url: "#", isNew: true },
                { title: "Vol. 41 - Capitolo 386", url: "#", date: "19 Agosto" },
                { title: "Vol. 40 - Capitolo 385", url: "#", date: "19 Marzo" },
              ],
            },
            // ... other fallback data
          ])
        }
      } catch (error) {
        console.error("[v0] Error fetching latest chapters:", error)
        setLatestData([])
      } finally {
        setLoading(false)
      }
    }

    fetchLatestChapters()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ultimi Capitoli Aggiunti</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 h-24 animate-pulse bg-muted"></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ultimi Capitoli Aggiunti</h2>
      </div>

      <div className="grid gap-4">
        {latestData.map((manga) => (
          <Card key={manga.id} className="p-4 h-full">
            <div className="flex gap-3 h-full">
              <div className="flex-shrink-0">
                <img
                  src={manga.image || "/placeholder.svg"}
                  alt={manga.title}
                  className="w-16 h-20 object-cover rounded flex-shrink-0"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    <Link href={`/manga/${obfuscateId(manga.id)}`} className="hover:text-primary">
                      {manga.title}
                    </Link>
                  </h3>
                </div>

                <div className="flex gap-2 mb-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {manga.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {manga.status}
                  </Badge>
                </div>

                <div className="space-y-1 flex-1">
                  {manga.chapters.map((chapter, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <Link
                        href={chapter.url}
                        className="text-primary hover:underline flex items-center gap-1 truncate min-w-0"
                      >
                        <span className="truncate">{chapter.title}</span>
                        {chapter.isNew && (
                          <span className="bg-red-500 text-white px-1 rounded text-[10px] flex-shrink-0">NUOVO</span>
                        )}
                      </Link>
                      {chapter.date && (
                        <span className="text-muted-foreground flex-shrink-0 text-xs">{chapter.date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
