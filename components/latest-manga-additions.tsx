"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { obfuscateId } from "@/lib/utils"
import { useState, useEffect } from "react"

interface LatestAddition {
  id: string
  title: string
  image: string
  type: string
  status: string
  date: string
  url: string
}

export function LatestMangaAdditions() {
  const [latestData, setLatestData] = useState<LatestAddition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLatestAdditions = async () => {
      try {
        console.log("[v0] Fetching latest manga additions...")
        const response = await fetch("/api/latest-manga-additions")
        const data = await response.json()

        if (data.ok && data.additions) {
          console.log("[v0] Loaded", data.additions.length, "latest additions")
          setLatestData(data.additions)
        } else {
          console.error("[v0] Failed to load latest additions:", data.error)
          setLatestData([
            {
              id: "4384",
              title: "Beck",
              image:
                "https://cdn.mangaworld.cx/mangas/68cc497d16935f6c3d5c684d.jpg?1758288180120",
              type: "Manga",
              status: "Finito",
              date: "18 Settembre 2025",
              url: "/manga/4384",
            },
            {
              id: "4383",
              title: "You Just Made My Day",
              image:
                "https://cdn.mangaworld.cx/mangas/68cb45d249d2566c95be3867.png?1758287844331",
              type: "Manhwa",
              status: "In corso",
              date: "18 Settembre 2025",
              url: "/manga/4383",
            },
          ])
        }
      } catch (error) {
        console.error("[v0] Error fetching latest additions:", error)
        setLatestData([])
      } finally {
        setLoading(false)
      }
    }

    fetchLatestAdditions()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={20} className="text-green-500" />
          <h2 className="text-lg font-semibold">Ultime aggiunte</h2>
        </div>
        <Card className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 p-2 rounded animate-pulse">
                <div className="w-16 h-20 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus size={20} className="text-green-500" />
        <h2 className="text-lg font-semibold">Ultime aggiunte</h2>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {latestData.map((manga) => (
            <Link
              key={manga.id}
              href={`/manga/${obfuscateId(manga.id)}`}
              className="block"
            >
              <div className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                  <img
                    src={manga.image || "/placeholder.svg"}
                    alt={manga.title}
                    className="w-16 h-20 object-cover rounded"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 hover:text-primary transition-colors">
                    {manga.title}
                  </h3>

                  <div className="space-y-1 text-xs">
                    {/* Tipo */}
                    <div>
                      <span className="font-semibold">Tipo: </span>
                      <Badge variant="secondary" className="text-xs mr-1">
                        {manga.type}
                      </Badge>
                    </div>

                    {/* Stato */}
                    <div>
                      <span className="font-semibold">Stato: </span>
                      <Badge variant="outline" className="text-xs mr-1">
                        {manga.status}
                      </Badge>
                    </div>

                    {/* Data */}
                    <div>
                      <span className="font-semibold">Data: </span>
                      <span className="text-muted-foreground">
                        {manga.date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
