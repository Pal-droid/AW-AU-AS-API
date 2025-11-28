"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, Check, Pause, X, RotateCcw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  mangaId: string
  mangaUrl: string
  title: string
  image?: string
  className?: string
}

type ListKey = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

const LIST_ACTIONS = [
  {
    key: "planning" as ListKey,
    icon: Plus,
    label: "Da leggere",
    color: "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950",
  },
  {
    key: "current" as ListKey,
    icon: BookOpen,
    label: "In corso",
    color: "text-green-500 hover:bg-green-50 dark:hover:bg-green-950",
  },
  {
    key: "completed" as ListKey,
    icon: Check,
    label: "Completato",
    color: "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950",
  },
  {
    key: "paused" as ListKey,
    icon: Pause,
    label: "In pausa",
    color: "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950",
  },
  {
    key: "dropped" as ListKey,
    icon: X,
    label: "Abbandonato",
    color: "text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
  },
  {
    key: "repeating" as ListKey,
    icon: RotateCcw,
    label: "In rilettura",
    color: "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950",
  },
]

export function MangaQuickListActions({ mangaId, mangaUrl, title, image, className }: Props) {
  const [currentList, setCurrentList] = useState<ListKey | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showChapterInput, setShowChapterInput] = useState(false)
  const [chapterProgress, setChapterProgress] = useState("")

  const seriesKey = `/manga/${mangaId}`
  const seriesPath = mangaUrl || seriesKey

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    async function checkListStatus() {
      try {
        const response = await fetch("/api/user-state")
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.lists) {
            for (const [listKey, listItems] of Object.entries(data.data.lists)) {
              if (listItems && typeof listItems === "object" && seriesKey in listItems) {
                setCurrentList(listKey as ListKey)
                break
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Failed to check manga list status:", error)
      }
    }

    if (seriesKey && isHydrated) {
      checkListStatus()
    }
  }, [seriesKey, isHydrated])

  async function toggleList(listKey: ListKey) {
    if (isLoading) return

    if (listKey === "current" && currentList !== "current") {
      setShowChapterInput(true)
      return
    }

    await performListUpdate(listKey)
  }

  async function performListUpdate(listKey: ListKey, chapter?: string) {
    setIsLoading(true)
    try {
      if (currentList === listKey) {
        // Remove from current list
        const response = await fetch("/api/user-state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "list-remove",
            list: listKey,
            seriesKey,
          }),
        })

        if (response.ok) {
          setCurrentList(null)
        }
      } else {
        // Remove from current list if exists
        if (currentList) {
          await fetch("/api/user-state", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op: "list-remove",
              list: currentList,
              seriesKey,
            }),
          })
        }

        // Add to new list
        const response = await fetch("/api/user-state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "list-add",
            list: listKey,
            seriesKey,
            seriesPath,
            title,
            image,
            ...(chapter && listKey === "current" && { chapter: Number.parseInt(chapter) || 1 }),
          }),
        })

        if (response.ok) {
          setCurrentList(listKey)

          if (listKey === "current" && chapter) {
            try {
              await fetch("/api/user-state", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  op: "continue-reading-update",
                  mangaId: seriesKey,
                  manga: title,
                  chapter: Number.parseInt(chapter) || 1,
                  progress: "0%",
                }),
              })
            } catch (error) {
              console.error("[v0] Failed to update continue reading:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error toggling manga list:", error)
    } finally {
      setIsLoading(false)
      setShowChapterInput(false)
      setChapterProgress("")
    }
  }

  const handleChapterSubmit = () => {
    const chapter = chapterProgress.trim()
    if (chapter && Number.parseInt(chapter) > 0) {
      performListUpdate("current", chapter)
    } else {
      performListUpdate("current", "1")
    }
  }

  const handleChapterCancel = () => {
    setShowChapterInput(false)
    setChapterProgress("")
  }

  if (!isHydrated) {
    return (
      <div className={cn("flex gap-1", className)}>
        {LIST_ACTIONS.slice(0, 3).map((action) => {
          const Icon = action.icon
          return (
            <Button key={action.key} variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>
    )
  }

  if (showChapterInput) {
    return (
      <div className={cn("flex flex-col gap-2 p-3 border rounded-lg bg-background", className)}>
        <p className="text-sm font-medium">Capitolo attuale:</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Es. 15"
            value={chapterProgress}
            onChange={(e) => setChapterProgress(e.target.value)}
            className="w-20"
            min="1"
            autoFocus
          />
          <Button size="sm" onClick={handleChapterSubmit} className="bg-green-500 hover:bg-green-600">
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={handleChapterCancel}>
            Annulla
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {LIST_ACTIONS.map((action) => {
        const Icon = action.icon
        const isActive = currentList === action.key

        return (
          <Button
            key={action.key}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleList(action.key)
            }}
            disabled={isLoading}
            className={cn(
              "h-8 w-8 p-0 transition-all duration-200",
              action.color,
              isActive && "bg-current/10 text-current",
            )}
            title={action.label}
          >
            <Icon className={cn("h-4 w-4", isActive && "fill-current")} />
          </Button>
        )
      })}
    </div>
  )
}
