"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, obfuscateUrl } from "@/lib/utils"
import Link from "next/link"

type Source = {
  name: string
  url: string
  id: string
}

type Props = {
  title: string
  href: string
  image: string
  isDub?: boolean
  className?: string
  sources?: Source[]
  has_multi_servers?: boolean
}

export function AnimeCard({ title, href, image, isDub, className, sources, has_multi_servers }: Props) {
  const path = (() => {
    try {
      const u = new URL(href, "https://dummy.local")
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return u.pathname
    } catch {
      const parts = href.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return href.startsWith("/") ? href : `/${href}`
    }
  })()

  const hasAnimeWorld = sources?.some((s) => s.name === "AnimeWorld")
  const hasAnimeSaturn = sources?.some((s) => s.name === "AnimeSaturn")
  const hasAnimePahe = sources?.some((s) => s.name === "AnimePahe")
  const showBadges = sources && sources.length > 0 && (hasAnimeWorld || hasAnimeSaturn || hasAnimePahe)

  const isAnimePaheImage = image.includes("animepahe.si") || image.includes("animepahe.com")
  const displayImage = isAnimePaheImage ? `/api/animepahe-image-proxy?url=${encodeURIComponent(image)}` : image

  const handleClick = () => {
    if (sources && sources.length > 0) {
      try {
        const storageKey = `anizone:sources:${path}`
        console.log("[v0] AnimeCard storing sources with key:", storageKey, "sources:", sources)
        sessionStorage.setItem(storageKey, JSON.stringify(sources))
      } catch (e) {
        console.error("Failed to store sources:", e)
      }
    } else {
      try {
        const animeId = path.split("/").pop() || ""
        if (animeId) {
          const defaultSources = [
            {
              name: "AnimeWorld",
              url: `https://www.animeworld.ac${path}`,
              id: animeId,
            },
          ]
          const storageKey = `anizone:sources:${path}`
          console.log("[v0] AnimeCard creating default sources with key:", storageKey, "sources:", defaultSources)
          sessionStorage.setItem(storageKey, JSON.stringify(defaultSources))
        }
      } catch (e) {
        console.error("Failed to store default sources:", e)
      }
    }
  }

  const obfuscatedPath = obfuscateUrl(path)

  return (
    <Link href={`/watch?p=${obfuscatedPath}`} className={cn("block", className)} onClick={handleClick}>
      <Card
        className={cn(
          "group cursor-pointer h-full overflow-hidden",
          "bg-card border-0 rounded-2xl",
          "shadow-sm hover:shadow-lg transition-all duration-300",
          "card-interactive",
        )}
      >
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative aspect-[2/3] overflow-hidden rounded-t-2xl bg-muted">
            <img
              src={displayImage || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {showBadges && (
              <div className="absolute top-3 left-3 flex gap-1.5">
                {hasAnimeWorld && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animeworld.ac&size=48"
                      alt="AnimeWorld"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                {hasAnimeSaturn && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animesaturn.cx&size=48"
                      alt="AnimeSaturn"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                {hasAnimePahe && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animepahe.si&size=48"
                      alt="AnimePahe"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {isDub && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-lg shadow-lg">
                  DUB
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 flex-1 flex flex-col min-h-[72px]">
            <h3 className="font-medium text-sm leading-snug text-foreground flex-1">
              <span className="line-clamp-2 break-words">{title}</span>
            </h3>
            {sources && sources.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1.5">{sources.length} fonti disponibili</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
