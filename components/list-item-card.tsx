"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Film, BookOpen, Book, ExternalLink } from "lucide-react"
import { obfuscateUrl, obfuscateId } from "@/lib/utils"

type ContentType = "anime" | "manga" | "light-novel" | "series-movies"

interface ListItemCardProps {
  itemId: string
  contentType: ContentType
  listName: string
  onRemove: () => void
  fetchMetadata: () => Promise<{ title: string; image: string | null }>
}

export function ListItemCard({ itemId, contentType, listName, onRemove, fetchMetadata }: ListItemCardProps) {
  const [metadata, setMetadata] = useState<{ title: string; image: string | null }>({ title: itemId, image: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await fetchMetadata()
        setMetadata(data)
      } catch (error) {
        console.error("[v0] Error loading metadata:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMetadata()
  }, [itemId, fetchMetadata])

  const getNavigationPath = () => {
    switch (contentType) {
      case "anime":
      case "series-movies":
        const animePath = `/play/${itemId}/episode-1`
        return `/watch?p=${obfuscateUrl(animePath)}`
      case "manga":
      case "light-novel":
        return `/manga/${obfuscateId(itemId)}`
      default:
        return "#"
    }
  }

  const getIcon = () => {
    switch (contentType) {
      case "anime":
      case "series-movies":
        return Film
      case "manga":
        return BookOpen
      case "light-novel":
        return Book
      default:
        return Film
    }
  }

  const Icon = getIcon()

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 hover:glow transition-all duration-300">
      <div className="shrink-0">
        {loading ? (
          <div className="w-16 h-20 rounded-lg bg-muted animate-pulse" />
        ) : metadata.image ? (
          <img
            src={metadata.image || "/placeholder.svg"}
            alt={metadata.title}
            className="w-16 h-20 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{loading ? "Caricamento..." : metadata.title}</h3>
        <p className="text-xs text-muted-foreground">
          {contentType === "anime"
            ? "Anime"
            : contentType === "manga"
              ? "Manga"
              : contentType === "light-novel"
                ? "Romanzo"
                : "Serie/Film"}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        <Link href={getNavigationPath()}>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 bg-transparent"
          >
            <ExternalLink size={14} className="mr-1" />
            Apri
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent"
        >
          Rimuovi
        </Button>
      </div>
    </div>
  )
}
