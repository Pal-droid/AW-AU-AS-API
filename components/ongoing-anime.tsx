"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Play } from "lucide-react"
import Link from "next/link"

type OngoingAnimeItem = {
  title: string
  href: string
  image: string
  currentEpisode: string
  totalEpisodes: string
  isDub?: boolean
  isONA?: boolean
  sources?: Array<{ name: string; url: string; id: string }>
}

export function OngoingAnime() {
  const [items, setItems] = useState<OngoingAnimeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/ongoing-anime")
        const ct = r.headers.get("content-type") || ""
        if (!ct.includes("application/json")) {
          const txt = await r.text()
          throw new Error(txt.slice(0, 200))
        }
        const j = await r.json()
        if (j.ok) setItems(j.items)
        else setError(j.error || "Errore nel caricamento")
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play size={16} />
          Anime in Corso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 animate-pulse">
                <div className="aspect-[2/3] bg-neutral-200 rounded-lg"></div>
                <div className="h-4 bg-neutral-200 rounded mt-2"></div>
              </div>
            ))
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nessun anime in corso disponibile</p>
            </div>
          ) : (
            items.map((item, index) => {
              const animePath = (() => {
                try {
                  const u = new URL(item.href)
                  return u.pathname
                } catch {
                  return item.href
                }
              })()

              return (
                <Link
                  key={`${item.href}-${index}`}
                  href={`/watch?path=${encodeURIComponent(animePath)}`}
                  className="relative flex-shrink-0 w-32 group cursor-pointer"
                  onClick={() => {
                    try {
                      const sources = item.sources || [
                        { name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" },
                      ]
                      sessionStorage.setItem(`anizone:sources:${animePath}`, JSON.stringify(sources))
                    } catch {}
                  }}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden w-full shadow-md transition-transform duration-300 transform hover:scale-105">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Episode badge */}
                    <div className="absolute top-2 left-2 py-0.5 px-1.5 rounded bg-blue-600/90 text-white text-xs font-medium">
                      {item.currentEpisode}/{item.totalEpisodes}
                    </div>

                    {/* ONA badge */}
                    {item.isONA && (
                      <div className="absolute top-2 right-2 py-0.5 px-1.5 rounded bg-purple-600/90 text-white text-xs font-medium">
                        ONA
                      </div>
                    )}

                    {/* Dub badge */}
                    {item.isDub && (
                      <div className="absolute bottom-2 right-2">
                        <span className="bg-gray-800 text-white text-[10px] px-1 py-[1px] rounded">DUB</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium mt-2 line-clamp-2 break-words group-hover:text-primary transition-colors duration-200">
                    {item.title}
                  </h3>
                </Link>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
