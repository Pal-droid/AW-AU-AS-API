"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { useState, useEffect } from "react"
import { obfuscateId } from "@/lib/utils"

interface TrendingChapter {
  id: string
  title: string
  image: string
  chapter: string
  url: string
}

export function TrendingChapters() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trendingData, setTrendingData] = useState<TrendingChapter[]>([])
  const [loading, setLoading] = useState(true)

  const CARD_WIDTH = 280 // width of each card in px (must match w-[280px])

  useEffect(() => {
    const fetchTrendingChapters = async () => {
      try {
        const response = await fetch("/api/trending-chapters")
        const data = await response.json()
        if (data.ok && data.chapters) {
          setTrendingData(data.chapters)
        }
      } catch (error) {
        console.error("[TrendingChapters] Error fetching trending chapters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingChapters()
  }, [])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % trendingData.length) // loops forward
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + trendingData.length) % trendingData.length) // loops backward
  }

  if (loading) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Flame size={20} className="text-orange-500" />
          <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
        </div>
        <div className="animate-pulse flex justify-center">
          <Card className="w-[280px] h-[380px] bg-neutral-200"></Card>
        </div>
      </div>
    )
  }

  if (trendingData.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Flame size={20} className="text-orange-500" />
          <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
        </div>
        <Card className="p-4 text-center text-muted-foreground">
          <p>Nessun capitolo di tendenza disponibile</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Flame size={20} className="text-orange-500" />
        <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
      </div>

      <div className="relative flex items-center justify-center">
        {/* Carousel wrapper */}
        <div className="w-[280px] overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * CARD_WIDTH}px)`,
              width: `${trendingData.length * CARD_WIDTH}px`,
            }}
          >
            {trendingData.map((item) => (
              <div key={item.id} className="w-[280px] flex-shrink-0 px-2">
                <Card className="p-3">
                  <Link href={`/manga/${obfuscateId(item.id)}`} className="block group">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg shadow-md transition-transform duration-300 transform group-hover:scale-105">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b">
                        {item.chapter}
                      </div>
                    </div>
                    <h3 className="mt-2 font-medium text-sm line-clamp-2 text-center group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Arrows */}
        {trendingData.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm shadow-lg"
              onClick={prevSlide}
            >
              <ChevronLeft size={28} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm shadow-lg"
              onClick={nextSlide}
            >
              <ChevronRight size={28} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
