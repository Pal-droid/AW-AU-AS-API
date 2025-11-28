"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchForm } from "@/components/search-form"
import { MangaSearchForm } from "@/components/manga-search-form"
import { AnimeCard } from "@/components/anime-card"
import { MangaCard } from "@/components/manga-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GENRES } from "@/lib/genre-map"
import Link from "next/link"
import { Film, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { cn } from "@/lib/utils"

type Source = {
  name: string
  url: string
  id: string
}

type AnimeItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
  sources?: Source[]
  has_multi_servers?: boolean
}

type MangaItem = {
  title: string
  url: string
  image: string
  type: string
  status: string
  author: string
  artist: string
  genres: string[]
  story: string
}

type PaginationInfo = {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  nextUrl?: string
  previousUrl?: string
}

export default function SearchPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const [searchType, setSearchType] = useState<"anime" | "manga">(() => {
    const tabParam = sp.get("tab")
    return tabParam === "manga" ? "manga" : "anime"
  })
  const [animeItems, setAnimeItems] = useState<AnimeItem[]>([])
  const [mangaItems, setMangaItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnified, setIsUnified] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showingDefaults, setShowingDefaults] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  const genreId = sp.get("genre")
  const keyword = sp.get("keyword")
  const queryString = useMemo(() => sp.toString(), [sp])

  const genreName = useMemo(() => {
    if (!genreId) return null
    const g = GENRES.find((x) => String(x.id) === genreId)
    return g?.name || `Genere ${genreId}`
  }, [genreId])

  const loadDefaultRecommendations = async () => {
    setLoading(true)
    setError(null)
    setShowingDefaults(true)
    try {
      const r = await fetch("/api/search")
      const ct = r.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        const txt = await r.text()
        throw new Error(txt.slice(0, 200))
      }
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || "Errore caricamento raccomandazioni")
      setAnimeItems(j.items)
      setPagination(j.pagination || null)
    } catch (e: any) {
      setError(e?.message || "Errore nel caricamento delle raccomandazioni")
    } finally {
      setLoading(false)
    }
  }

  const searchAnime = async () => {
    setLoading(true)
    setError(null)
    setIsUnified(false)
    setHasSearched(true)
    setShowingDefaults(false)

    try {
      let r: Response
      const hasFilters = hasOtherFilters()

      if (genreId && !keyword) {
        r = await fetch(`/api/search?${queryString}`)
      } else if (keyword && !hasFilters) {
        r = await fetch(`/api/unified-search?keyword=${encodeURIComponent(keyword)}`)
        setIsUnified(true)
      } else {
        r = await fetch(`/api/search?${queryString}`)
      }

      const ct = r.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        const txt = await r.text()
        throw new Error(txt.slice(0, 200))
      }
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || "Errore ricerca")
      setAnimeItems(j.items)
      if (!isUnified) {
        setIsUnified(j.unified || false)
      }
      setPagination(j.pagination || null)
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca")
    } finally {
      setLoading(false)
    }
  }

  const searchManga = async (params: {
    keyword: string
    type: string
    author: string
    year: string
    genre: string
    artist: string
    sort: string
    page?: string
  }) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const searchParams = new URLSearchParams()
      if (params.keyword) searchParams.set("keyword", params.keyword)
      if (params.type && params.type !== "all") searchParams.set("type", params.type)
      if (params.author) searchParams.set("author", params.author)
      if (params.year) searchParams.set("year", params.year)
      if (params.genre) searchParams.set("genre", params.genre)
      if (params.artist) searchParams.set("artist", params.artist)
      if (params.sort && params.sort !== "default") searchParams.set("sort", params.sort)
      const page = params.page || "1"
      if (page !== "1") searchParams.set("page", page)

      const response = await fetch(`/api/manga-search?${searchParams.toString()}`)
      const data = await response.json()
      setMangaItems(data.results || [])
      setPagination(data.pagination || null)
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca manga")
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  const hasOtherFilters = () => {
    const allParams = Array.from(sp.entries())
    return allParams.some(([key, value]) => {
      if (key === "keyword" || key === "genre" || key === "tab" || key === "page") return false
      return value && value.trim() !== "" && value !== "any" && value !== "all"
    })
  }

  useEffect(() => {
    const tabParam = sp.get("tab")
    if (tabParam === "manga" || tabParam === "anime") {
      setSearchType(tabParam)
    }
  }, [sp])

  useEffect(() => {
    if (searchType === "anime") {
      if (queryString) {
        searchAnime()
      } else {
        loadDefaultRecommendations()
      }
    }
  }, [queryString, genreId, searchType])

  useEffect(() => {
    if (searchType === "manga") {
      const page = sp.get("page") || "1"
      if (keyword) {
        searchManga({
          keyword: keyword,
          type: "all",
          author: "",
          year: "",
          genre: "",
          artist: "",
          sort: "default",
          page: page,
        })
      } else {
        searchManga({
          keyword: "",
          type: "all",
          author: "",
          year: "",
          genre: "",
          artist: "",
          sort: "default",
          page: page,
        })
      }
    }
  }, [searchType, keyword, sp.get("page")])

  const navigateToPage = (pageNum: number) => {
    if (!pagination) return
    let targetPage = pageNum
    if (pageNum > pagination.totalPages) targetPage = 1
    else if (pageNum < 1) targetPage = pagination.totalPages

    const newParams = new URLSearchParams(sp.toString())
    newParams.set("page", targetPage.toString())
    router.push(`/search?${newParams.toString()}`)
  }

  const SkeletonCard = () => (
    <div className="space-y-3">
      <div className="aspect-[2/3] skeleton rounded-2xl" />
      <div className="space-y-2 px-1">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
      </div>
    </div>
  )

  const PaginationBar = () => {
    if (!pagination || isUnified) return null

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          onClick={() => navigateToPage(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevious}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-muted/50 text-foreground transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:bg-muted active:scale-95",
          )}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30">
          <span className="text-sm text-muted-foreground">Pagina</span>
          <input
            type="number"
            min="1"
            max={pagination.totalPages}
            value={pagination.currentPage}
            onChange={(e) => {
              const page = Number.parseInt(e.target.value)
              if (page >= 1 && page <= pagination.totalPages) {
                navigateToPage(page)
              }
            }}
            className={cn(
              "w-12 px-2 py-1 text-sm text-center rounded-lg",
              "bg-card border border-border text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          />
          <span className="text-sm text-muted-foreground">di {pagination.totalPages}</span>
        </div>

        <button
          onClick={() => navigateToPage(pagination.currentPage + 1)}
          disabled={!pagination.hasNext}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-muted/50 text-foreground transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:bg-muted active:scale-95",
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu currentPath="/search" />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 py-4 flex items-center justify-center">
          <Link href="/" className="text-xl font-bold text-foreground">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-5 space-y-5 max-w-7xl mx-auto">
        <Tabs
          value={searchType}
          onValueChange={(value) => setSearchType(value as "anime" | "manga")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger
              value="anime"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl h-full",
                "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                "transition-all duration-200",
              )}
            >
              <Film size={18} />
              <span className="font-medium">Anime</span>
            </TabsTrigger>
            <TabsTrigger
              value="manga"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl h-full",
                "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                "transition-all duration-200",
              )}
            >
              <BookOpen size={18} />
              <span className="font-medium">Manga</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anime" className="space-y-5 mt-5">
            <div className="surface-elevated p-5">
              <h1 className="text-xl font-bold text-foreground">
                {showingDefaults ? "Raccomandazioni" : genreId ? `Genere: ${genreName}` : "Cerca Anime"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {showingDefaults ? "Anime popolari e nuove uscite per te" : "Trova episodi sub/dub ITA"}
              </p>
              {isUnified && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Ricerca unificata
                </div>
              )}
            </div>

            <SearchForm />

            {error && (
              <div className="surface-elevated p-4 border-l-4 border-destructive">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : animeItems.length === 0 && hasSearched ? (
              <div className="surface-elevated p-8 text-center">
                <Film size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Nessun risultato</h2>
                <p className="text-muted-foreground text-sm">Prova a cambiare parola chiave o filtri</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {animeItems.map((it) => (
                    <AnimeCard
                      key={it.href}
                      title={it.title}
                      href={it.href}
                      image={it.image}
                      isDub={it.isDub}
                      sources={it.sources}
                      has_multi_servers={it.has_multi_servers}
                    />
                  ))}
                </div>
                <PaginationBar />
              </>
            )}
          </TabsContent>

          <TabsContent value="manga" className="space-y-5 mt-5">
            <div className="surface-elevated p-5">
              <h1 className="text-xl font-bold text-foreground">Cerca Manga</h1>
              <p className="text-sm text-muted-foreground mt-1">Trova capitoli tradotti in ITA</p>
            </div>

            <MangaSearchForm onSearch={searchManga} isLoading={loading} />

            {error && (
              <div className="surface-elevated p-4 border-l-4 border-destructive">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : mangaItems.length === 0 && hasSearched ? (
              <div className="surface-elevated p-8 text-center">
                <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Nessun risultato</h2>
                <p className="text-muted-foreground text-sm">Non sono stati trovati manga. Prova con altri filtri.</p>
              </div>
            ) : mangaItems.length > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Risultati ({mangaItems.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {mangaItems.map((manga, index) => (
                    <MangaCard key={index} manga={manga} />
                  ))}
                </div>
                <PaginationBar />
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
