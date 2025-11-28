"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { obfuscateId } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { authManager } from "@/lib/auth"

type ContinueReadingEntry = {
  manga_id: string
  chapter: number
  page: number
  title?: string
  image?: string
  updatedAt: number
}

export async function saveMangaProgress(
  mangaId: string,
  chapter: number,
  page: number,
  title?: string,
  image?: string,
) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) throw new Error("No auth token found")

    const getCurrentData = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/data", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!getCurrentData.ok) throw new Error("Failed to get current user data")

    const currentData = await getCurrentData.json()

    const userData = {
      ...currentData,
      continue_reading: currentData.continue_reading || [],
      manga_lists: {
        ...currentData.manga_lists,
        in_corso: currentData.manga_lists?.in_corso || [],
      },
    }

    const existingIndex = userData.continue_reading.findIndex((item: any) => item.manga_id === mangaId)

    const readingEntry = { manga_id: mangaId, chapter, page }

    if (existingIndex >= 0) {
      userData.continue_reading[existingIndex] = readingEntry
    } else {
      userData.continue_reading.push(readingEntry)
    }

    if (!userData.manga_lists.in_corso.includes(mangaId)) {
      userData.manga_lists.in_corso.push(mangaId)
    }

    const saveResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/data", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!saveResponse.ok) throw new Error("Failed to save manga progress")

    return true
  } catch (error) {
    console.error("[v0] Failed to save manga progress:", error)
    return false
  }
}

export function ContinueReading() {
  const [items, setItems] = useState<ContinueReadingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const { user } = useAuth()

  const load = useMemo(
    () => async () => {
      setLoading(true)
      try {
        if (!user?.token) {
          setItems([])
          setLoading(false)
          return
        }

        const continueReadingData = await authManager.getContinueReading()

        if (continueReadingData && Object.keys(continueReadingData).length > 0) {
          const enriched = await Promise.all(
            Object.entries(continueReadingData).map(async ([mangaId, data]: [string, any]) => {
              let title = data.manga || mangaId
              let image = data.image

              try {
                const response = await fetch(`/api/manga-info?id=${encodeURIComponent(mangaId)}`)
                if (response.ok) {
                  const metadata = await response.json()
                  title = metadata.title || title
                  image = metadata.image || image
                }
              } catch (error) {
                console.log("[v0] Failed to fetch manga metadata for:", mangaId, error)
              }

              return {
                manga_id: mangaId,
                chapter: data.chapter || 1,
                page: data.page || 1,
                title,
                image,
                updatedAt: Date.now(),
              }
            }),
          )

          enriched.sort((a, b) => b.updatedAt - a.updatedAt)
          setItems(enriched)
        } else {
          setItems([])
        }
      } catch (error) {
        console.error("[v0] Failed to load continue reading:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [user?.token],
  )

  useEffect(() => {
    load()
    mountedRef.current = true
  }, [load])

  if (!mountedRef.current) return null
  if (items.length === 0 && !loading) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Continua a leggere</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[120px] shrink-0 space-y-2 animate-pulse">
                <div className="w-full aspect-[2/3] rounded-lg bg-gray-200" />
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            ))
          : items.map((item) => (
              <div key={`${item.manga_id}-${item.chapter}`} className="w-[120px] shrink-0 flex flex-col">
                <div className="space-y-2">
                  <div className="relative">
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                      {item.image ? (
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title || "Manga"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=240&width=180&query=manga cover`
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <div className="text-center text-muted-foreground text-xs font-medium p-2">
                            {item.title || "Manga"}
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <div className="text-xs text-white/90 font-medium">
                          Cap. {item.chapter}
                          {item.page > 0 ? ` • Pag. ${item.page}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-16 flex items-start">
                    <h3 className="text-xs font-medium line-clamp-2 text-center w-full">{item.title || "Manga"}</h3>
                  </div>

                  <Link href={`/manga/${obfuscateId(item.manga_id)}`}>
                    <Button size="sm" className="w-full">
                      Riprendi
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
      </CardContent>
    </Card>
  )
}
