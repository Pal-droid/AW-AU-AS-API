"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Loader2 } from "lucide-react"

interface UpcomingAnime {
  id: string
  title: string
  japaneseTitle: string
  image: string
  url: string
  isDub: boolean
  isOna: boolean
  type: string
}

interface ApiResponse {
  success: boolean
  data: UpcomingAnime[]
  count: number
  widgetTitle?: string
  error?: string
  debug?: {
    foundItems: number
  }
}

export default function UpcomingFall() {
  const [anime, setAnime] = useState<UpcomingAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [widgetTitle, setWidgetTitle] = useState<string>("")

  useEffect(() => {
    const fetchUpcomingAnime = async () => {
      try {
        const response = await fetch("/api/upcoming-fall-2025")

        if (!response.ok) {
          console.log("[v0] API response status:", response.status)
          const data = await response.json().catch(() => ({}))
          setWidgetTitle(data.widgetTitle || "Uscite Inverno 2026")
          setError(data.error || "Failed to load upcoming anime")
          setLoading(false)
          return
        }

        const data: ApiResponse = await response.json()
        console.log("Items found in API:", data.debug?.foundItems)

        if (data.success) {
          setAnime(data.data)
          setWidgetTitle(data.widgetTitle || "")
        } else {
          setError(data.error || "Failed to load upcoming anime")
        }
      } catch (err) {
        setError("Network error occurred")
        console.error("Error fetching upcoming anime:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUpcomingAnime()
  }, [])

  const displayTitle = widgetTitle || "Uscite Autunno 2025"

  if (loading) {
    return (
      <Card className="glass rounded-xl transition-smooth hover:glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-orange-400" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass rounded-xl transition-smooth hover:glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-orange-400" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (anime.length === 0) {
    return (
      <Card className="glass rounded-xl transition-smooth hover:glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-orange-400" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">Nessun anime in arrivo trovato</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass rounded-xl transition-smooth hover:glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-orange-400" />
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
          {anime.map((animeItem) => (
            <div
              key={animeItem.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={animeItem.image || "/placeholder.svg"}
                  alt={animeItem.title}
                  className="w-12 h-16 object-cover rounded-md"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-md" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground transition-colors line-clamp-2">
                  {animeItem.title}
                </h3>
                {animeItem.japaneseTitle && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{animeItem.japaneseTitle}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  {animeItem.isDub && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border-blue-500/30"
                    >
                      DUB
                    </Badge>
                  )}
                  {animeItem.isOna && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border-purple-500/30"
                    >
                      ONA
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border-orange-500/30"
                  >
                    In arrivo
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
