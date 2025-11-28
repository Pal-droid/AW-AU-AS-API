"use client"

import type React from "react"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSeconds } from "@/lib/time"
import { useAuth } from "@/contexts/auth-context"
import { authManager } from "@/lib/auth"
import { obfuscateUrl } from "@/lib/utils"

type ContinueEntry = {
  seriesKey: string
  seriesPath: string
  title: string
  episode: { num: number; href: string }
  updatedAt: number
  positionSeconds?: number
  image?: string
}

// Cache for meta
const metaCache = new Map<string, { title: string; image?: string; ts: number }>()

export function ContinueWatching() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ContinueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || initialized.current) return
    initialized.current = true

    async function fetchEntries() {
      try {
        const token = await authManager.getIdToken()
        const res = await fetch("/api/user-history", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Failed to fetch history")
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        const mapped: ContinueEntry[] = items.map((it) => {
          const { animeId, episodeNumber, playbackPosition, updatedAt } = it
          return {
            seriesKey: animeId,
            seriesPath: animeId,
            title: animeId,
            episode: { num: episodeNumber, href: `/anime/${animeId}/episode/${episodeNumber}` },
            updatedAt: new Date(updatedAt).getTime(),
            positionSeconds: playbackPosition
          }
        })
        setEntries(mapped)

        // fetch meta
        mapped.forEach(async (entry) => {
          const cache = metaCache.get(entry.seriesKey)
          if (cache && Date.now() - cache.ts < 5 * 60 * 1000) {
            setEntries((prev) =>
              prev.map((p) => (p.seriesKey === entry.seriesKey ? { ...p, ...cache } : p))
            )
            return
          }
          try {
            const r = await fetch(`/api/anime-meta?id=${encodeURIComponent(entry.seriesKey)}`)
            if (r.ok) {
              const d = await r.json()
              const meta = { title: d.title, image: d.image, ts: Date.now() }
              metaCache.set(entry.seriesKey, meta)
              setEntries((prev) =>
                prev.map((p) => (p.seriesKey === entry.seriesKey ? { ...p, ...meta } : p))
              )
            }
          } catch (e) {
            console.error("meta fetch err", e)
          }
        })
      } catch (e) {
        console.error("err loading history", e)
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
    const id = setInterval(fetchEntries, 30 * 1000)
    return () => clearInterval(id)
  }, [user])

  async function handleClick(e: React.MouseEvent, entry: ContinueEntry) {
    e.preventDefault()
    try {
      const token = await authManager.getIdToken()

      // Restore old flow: fetch episodes + sources from your API
      const [episodesRes, sourcesRes] = await Promise.all([
        fetch(`/api/anime-episodes?path=${encodeURIComponent(entry.seriesKey)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/unified-search?keyword=${encodeURIComponent(entry.seriesKey)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const episodes = episodesRes.ok ? await episodesRes.json() : []
      const sources = sourcesRes.ok ? await sourcesRes.json() : []

      // Save into sessionStorage like old component
      sessionStorage.setItem(
        "animeData",
        JSON.stringify({
          episodes,
          sources
        })
      )

      // Redirect to watch page
      window.location.href = `/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`
    } catch (err) {
      console.error("Error handling continue watching click:", err)
      window.location.href = `/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`
    }
  }

  if (loading) return null
  if (!entries.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continue Watching</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {entries.map((entry) => (
          <div key={entry.seriesKey} className="flex items-center gap-4">
            {entry.image && (
              <img
                src={entry.image}
                alt={entry.title}
                className="w-16 h-24 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <Link
                href={`/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`}
                onClick={(e) => handleClick(e, entry)}
                className="font-medium hover:underline"
              >
                {entry.title}
              </Link>
              <div className="text-sm text-muted-foreground">
                Ep {entry.episode.num}
                {entry.positionSeconds
                  ? ` — at ${formatSeconds(entry.positionSeconds)}`
                  : null}
              </div>
            </div>
            <Button
              asChild
              onClick={(e) => handleClick(e, entry)}
              variant="secondary"
              size="sm"
            >
              <Link
                href={`/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`}
              >
                Resume
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
