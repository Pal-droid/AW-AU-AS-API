"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw, ListIcon, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deobfuscateUrl } from "@/lib/utils"
import { SlideOutMenu } from "@/components/slide-out-menu"

interface MangaReaderProps {
  params: {
    id: string
  }
  searchParams: {
    u?: string // obfuscated URL
    url?: string // legacy URL
    title?: string
    chapter?: string
  }
}

function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = "200px" }: IntersectionObserverInit = {},
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry)
  }

  useEffect(() => {
    const node = elementRef?.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || !node) return

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(node)

    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin])

  return entry
}

function LazyImage({
  src,
  alt,
  index,
  onError,
  onLoad,
}: {
  src: string
  alt: string
  index: number
  onError: () => void
  onLoad: () => void
}) {
  const imgRef = useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(imgRef, { threshold: 0.1 })
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError()
  }, [onError])

  return (
    <div ref={imgRef} className="text-center min-h-[400px] flex items-center justify-center">
      {entry?.isIntersecting ? (
        hasError ? (
          <Card className="bg-gray-900 border-gray-700 mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400 mb-4">Errore nel caricamento dell'immagine {index + 1}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setHasError(false)
                  setIsLoaded(false)
                }}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <RotateCcw size={16} className="mr-2" />
                Riprova
              </Button>
            </CardContent>
          </Card>
        ) : (
          <img
            id={`page-${index}`}
            className="page-image img-fluid"
            src={src || "/placeholder.svg"}
            alt={alt}
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              display: "block",
              margin: "0 auto",
            }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      ) : (
        <div className="w-full h-96 bg-gray-800 rounded flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Caricamento...</div>
        </div>
      )}
    </div>
  )
}

export default function MangaReader({ params, searchParams }: MangaReaderProps) {
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<"single" | "list">("list") // Default to list mode as per requirements

  const getImageUrl = (originalUrl: string) => {
    return originalUrl || "/placeholder.svg"
  }

  const chapterUrl = searchParams.u ? deobfuscateUrl(searchParams.u) : searchParams.url

  useEffect(() => {
    const fetchPages = async () => {
      if (!chapterUrl) {
        setError("URL del capitolo mancante")
        setIsLoading(false)
        return
      }

      try {
        const fetchUrl = `/api/manga-pages?url=${encodeURIComponent(chapterUrl)}`
        console.log("[v0] Fetching manga pages with URL:", chapterUrl)
        const response = await fetch(fetchUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch manga pages: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Received pages data:", data)

        if (!data.pages || data.pages.length === 0) {
          throw new Error("No pages found in response")
        }

        setPages(data.pages || [])
      } catch (err) {
        console.error("[v0] Error fetching pages:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [chapterUrl])

  const handleImageError = (pageIndex: number) => {
    setImageErrors((prev) => new Set(prev).add(pageIndex))
  }

  const handleImageRetry = (pageIndex: number) => {
    setImageErrors((prev) => {
      const newSet = new Set(prev)
      newSet.delete(pageIndex)
      return newSet
    })
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (viewMode === "single") {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        nextPage()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        prevPage()
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, pages.length, viewMode])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-4">Caricamento pagine...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || pages.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Errore nel caricamento</h2>
            <p className="text-gray-400 mb-4">Non è stato possibile caricare le pagine del manga.</p>
            <Button asChild variant="outline">
              <Link href={`/manga/${params.id}`}>
                <ArrowLeft size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white pb-16">
      {/* Slide-out menu component */}
      <SlideOutMenu currentPath={`/manga/${params.id}/read`} />

      {/* Header */}
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 border-b border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
              <Link href={`/manga/${params.id}`}>
                <ArrowLeft size={16} />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-sm">{searchParams.title || "Manga Reader"}</h1>
              <p className="text-xs text-gray-400">
                {viewMode === "single" ? `Pagina ${currentPage + 1} di ${pages.length}` : `${pages.length} pagine`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "single" | "list")}>
              <TabsList className="bg-gray-800 border-gray-700">
                <TabsTrigger value="single" className="text-white data-[state=active]:bg-gray-700">
                  <BookOpen size={14} />
                </TabsTrigger>
                <TabsTrigger value="list" className="text-white data-[state=active]:bg-gray-700">
                  <ListIcon size={14} />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {viewMode === "single" && (
              <Badge variant="outline" className="text-white border-white/20">
                {Math.round(((currentPage + 1) / pages.length) * 100)}%
              </Badge>
            )}
          </div>
        </div>
      </header>

      {viewMode === "list" ? (
        // List View - All pages displayed vertically
        <div className="px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {pages.map((pageUrl, index) => (
              <LazyImage
                key={index}
                src={pageUrl || "/placeholder.svg"}
                alt={`Pagina ${index + 1}`}
                index={index}
                onError={() => handleImageError(index)}
                onLoad={() => console.log(`[v0] Successfully loaded image ${index + 1}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        // Single Page View - Original implementation
        <>
          <div className="pt-4 pb-20">
            <div className="flex items-center justify-center min-h-screen px-4">
              {imageErrors.has(currentPage) ? (
                <Card className="bg-gray-900 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400 mb-4">Errore nel caricamento dell'immagine</p>
                    <Button
                      variant="outline"
                      onClick={() => handleImageRetry(currentPage)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <RotateCcw size={16} className="mr-2" />
                      Riprova
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <img
                  id={`page-${currentPage}`}
                  className="page-image img-fluid"
                  src={pages[currentPage] || "/placeholder.svg"}
                  alt={`Pagina ${currentPage + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  onError={() => handleImageError(currentPage)}
                  onLoad={() => {
                    console.log(`[v0] Successfully loaded single page image ${currentPage + 1}`)
                  }}
                />
              )}
            </div>
          </div>

          {/* Navigation Controls - Only for single page mode */}
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur z-20 border-t border-gray-800">
            <div className="px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 0}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowLeft size={16} className="mr-1" />
                Precedente
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {currentPage + 1} / {pages.length}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                Successiva
                <ArrowLeft size={16} className="ml-1 rotate-180" />
              </Button>
            </div>
          </div>

          {/* Click areas for navigation - Only for single page mode */}
          <div className="fixed inset-0 flex pt-16 pb-20 pointer-events-none z-10">
            <div className="flex-1 cursor-pointer pointer-events-auto" onClick={prevPage} />
            <div className="flex-1 cursor-pointer pointer-events-auto" onClick={nextPage} />
          </div>
        </>
      )}
    </main>
  )
}
