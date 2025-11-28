"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { obfuscateId } from "@/lib/utils"
import { useEffect, useState } from "react"

interface MangaRanking {
  rank: number
  id: string
  title: string
  image: string
  type: string
  status: string
  views: string
  url: string
}

export function MangaOfMonth() {
  const [mangas, setMangas] = useState<MangaRanking[]>([])

  useEffect(() => {
    const fetchMangas = async () => {
      const res = await fetch("/api/manga-of-month")
      const data = await res.json()
      if (data.ok) {
        setMangas(data.mangas)
      }
    }
    fetchMangas()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star size={20} className="text-yellow-500" />
        <h2 className="text-lg font-semibold">Manga del mese</h2>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {mangas.map((manga) => (
            <div
              key={manga.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {manga.rank}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={manga.image || "/placeholder.svg"}
                  alt={manga.title}
                  className="w-12 h-16 object-cover rounded"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-1">
                  <Link
                    href={`/manga/${obfuscateId(manga.id)}`}
                    className="hover:text-primary transition-colors"
                  >
                    {manga.title}
                  </Link>
                </h3>

                {/* Badges with clear labels */}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {manga.type && (
                    <Badge variant="secondary" className="text-xs">
                      Tipo: {manga.type.trim()}
                    </Badge>
                  )}
                  {manga.status && (
                    <Badge variant="outline" className="text-xs">
                      Stato: {manga.status.trim()}
                    </Badge>
                  )}
                </div>

                {/* Views always separated */}
                {manga.views && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Letto: {manga.views.trim()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
