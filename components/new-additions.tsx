"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"

type NewAdditionItem = {
  title: string
  href: string
  image: string
  status?: string
}

export function NewAdditions() {
  const [items, setItems] = useState<NewAdditionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/new-additions")
        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          const text = await res.text()
          throw new Error(text.slice(0, 200))
        }
        const data = await res.json()
        if (data.ok) setItems(data.items)
        else setError(data.error || "Errore nel caricamento")
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          Nuove Aggiunte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-32 animate-pulse">
                <div className="aspect-[2/3] bg-neutral-200 rounded-lg" />
                <div className="h-4 bg-neutral-200 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && <div className="text-sm text-red-600 py-6 text-center">{error}</div>}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Plus size={42} className="opacity-40 mb-2" />
            <p className="text-sm">Nessuna nuova aggiunta disponibile</p>
          </div>
        )}

        {/* Items */}
        {!loading && !error && items.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {items.map((item, index) => {
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
                  className="group shrink-0 w-32"
                  onClick={() => {
                    try {
                      const sources = [{ name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" }]
                      sessionStorage.setItem(`anizone:sources:${animePath}`, JSON.stringify(sources))
                    } catch {}
                  }}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 w-full">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    {item.status && (
                      <div className="absolute top-2 right-2 px-1 py-0 rounded text-xs bg-secondary text-secondary-foreground shadow z-10">
                        {item.status}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium mt-2 group-hover:text-primary transition-colors overflow-hidden">
                    <span className="line-clamp-2 break-words leading-tight">{item.title}</span>
                  </h3>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
