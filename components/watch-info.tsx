"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimeCard } from "@/components/anime-card"

type Meta = {
  title: string
  jtitle?: string
  image?: string
  rating?: string
  votesCount?: string
  audio?: string
  releaseDate?: string
  season?: string
  studio?: string
  duration?: string
  episodesCount?: string
  status?: string
  views?: string
  genres: { name: string; href?: string }[]
  description?: string
}

type AnimeItem = {
  title: string
  href: string
  image?: string
  sources?: Array<{ name: string; url: string; id: string }>
  has_multi_servers?: boolean
}

export function WatchInfo({ seriesPath }: { seriesPath: string }) {
  const path = useMemo(() => {
    try {
      // Handle full URLs
      if (seriesPath.startsWith("http")) {
        const u = new URL(seriesPath)
        const parts = u.pathname.split("/").filter(Boolean)
        if (parts.length >= 2 && parts[0] === "play") {
          return `/${parts[0]}/${parts[1]}`
        }
        return u.pathname
      }

      // Handle paths
      const parts = seriesPath.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return seriesPath.startsWith("/") ? seriesPath : `/${seriesPath}`
    } catch {
      const parts = seriesPath.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return seriesPath.startsWith("/") ? seriesPath : `/${seriesPath}`
    }
  }, [seriesPath])

  const animeWorldPath = useMemo(() => {
    try {
      const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
      if (storedSources) {
        const parsedSources = JSON.parse(storedSources)
        const awSource = parsedSources.find((s: any) => s.name === "AnimeWorld")
        if (awSource && awSource.id) {
          return `/play/${awSource.id}`
        }
      }
    } catch (e) {
      // Ignore
    }
    return path
  }, [path])

  const [meta, setMeta] = useState<Meta | null>(null)
  const [similar, setSimilar] = useState<AnimeItem[]>([])
  const [related, setRelated] = useState<AnimeItem[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [loadingRelated, setLoadingRelated] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let metaPath = path
        try {
          const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
          if (storedSources) {
            const parsedSources = JSON.parse(storedSources)
            const asSource = parsedSources.find((s: any) => s.name === "AnimeSaturn")
            if (asSource && asSource.url) {
              metaPath = asSource.url
            }
          }
        } catch (e) {
          // Ignore sessionStorage errors
        }

        // Fetch metadata
        fetch(`/api/anime-meta?path=${encodeURIComponent(metaPath)}`)
          .then((x) => x.json())
          .then((m) => {
            if (alive && m?.ok) setMeta(m.meta)
          })
          .catch(() => {})

        console.log("[v0] WatchInfo fetching related/similar with path:", animeWorldPath)

        // Fetch similar anime
        fetch(`/api/anime-similar?path=${encodeURIComponent(animeWorldPath)}`)
          .then((x) => x.json())
          .then((s) => {
            if (alive) {
              console.log("[v0] WatchInfo similar response:", s)
              if (s?.ok && s.items) {
                setSimilar(s.items)
              }
              setLoadingSimilar(false)
            }
          })
          .catch((err) => {
            console.error("[v0] WatchInfo similar error:", err)
            if (alive) setLoadingSimilar(false)
          })

        // Fetch related anime
        fetch(`/api/anime-related?path=${encodeURIComponent(animeWorldPath)}`)
          .then((x) => x.json())
          .then((r) => {
            if (alive) {
              console.log("[v0] WatchInfo related response:", r)
              if (r?.ok && r.items) {
                setRelated(r.items)
              }
              setLoadingRelated(false)
            }
          })
          .catch((err) => {
            console.error("[v0] WatchInfo related error:", err)
            if (alive) setLoadingRelated(false)
          })
      } catch (e) {
        console.error("[v0] WatchInfo error:", e)
        if (alive) {
          setLoadingSimilar(false)
          setLoadingRelated(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [path, animeWorldPath])

  return (
    <div className="grid gap-4">
      {meta ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-[100vw] overflow-x-hidden">
              <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[130px_1fr] gap-4 min-w-0">
                <div className="sm:justify-self-start flex items-center">
                  <img
                    src={meta.image || "/placeholder.svg?height=195&width=130&query=anime%20poster"}
                    alt={meta.title}
                    className="sm:w-[130px] w-[120px] sm:h-[195px] h-[180px] object-cover rounded max-w-full"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex flex-col justify-start">
                  <div className="text-lg font-semibold">{meta.title}</div>
                  {meta.jtitle ? <div className="text-sm text-muted-foreground mb-3">{meta.jtitle}</div> : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {meta.rating ? (
                      <div>
                        Voto: <span className="font-medium text-foreground">{meta.rating}</span>
                        {meta.votesCount ? <span className="ml-1">({meta.votesCount})</span> : null}
                      </div>
                    ) : null}
                    {meta.audio ? (
                      <div>
                        Audio: <span className="text-foreground">{meta.audio}</span>
                      </div>
                    ) : null}
                    {meta.duration ? (
                      <div>
                        Durata: <span className="text-foreground">{meta.duration}</span>
                      </div>
                    ) : null}
                    {meta.episodesCount ? (
                      <div>
                        Episodi: <span className="text-foreground">{meta.episodesCount}</span>
                      </div>
                    ) : null}
                    {meta.status ? (
                      <div>
                        Stato: <span className="text-foreground">{meta.status}</span>
                      </div>
                    ) : null}
                    {meta.releaseDate ? (
                      <div>
                        Uscita: <span className="text-foreground">{meta.releaseDate}</span>
                      </div>
                    ) : null}
                    {meta.studio ? (
                      <div>
                        Studio: <span className="text-foreground">{meta.studio}</span>
                      </div>
                    ) : null}
                    {meta.views ? (
                      <div>
                        Visualizzazioni: <span className="text-foreground">{meta.views}</span>
                      </div>
                    ) : null}
                  </div>
                  {meta.genres?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {meta.genres.map((g) => (
                        <span key={g.name} className="inline-flex text-xs border rounded px-2 py-0.5">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {meta.description ? (
                <div className="mt-4 text-sm text-muted-foreground break-words">
                  <div className="font-medium text-foreground mb-2">Trama:</div>
                  {meta.description}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loadingSimilar ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Serie simili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 w-[150px] h-[260px] bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : similar?.length ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Serie simili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative -mx-6 sm:mx-0">
              <div className="px-6 sm:px-0 w-full max-w-[100vw] min-w-0 overflow-x-auto no-scrollbar overscroll-x-contain">
                <div className="flex gap-3 min-w-0">
                  {similar.map((it) => (
                    <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                      <AnimeCard
                        title={it.title}
                        href={it.href}
                        image={it.image || ""}
                        sources={it.sources}
                        has_multi_servers={it.has_multi_servers}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loadingRelated ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Correlati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 w-[150px] h-[260px] bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : related?.length ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Correlati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative -mx-6 sm:mx-0">
              <div className="px-6 sm:px-0 w-full max-w-[100vw] min-w-0 overflow-x-auto no-scrollbar overscroll-x-contain">
                <div className="flex gap-3 min-w-0">
                  {related.map((it) => (
                    <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                      <AnimeCard
                        title={it.title}
                        href={it.href}
                        image={it.image || ""}
                        sources={it.sources}
                        has_multi_servers={it.has_multi_servers}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
