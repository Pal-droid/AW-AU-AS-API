"use client"

import Link from "next/link"
import { BookOpen, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MangaCard } from "@/components/manga-card"
import { MangaSearchForm } from "@/components/manga-search-form"
import { SlideOutMenu } from "@/components/slide-out-menu"

interface MangaResult {
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

interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export default function MangaSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<MangaResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  useEffect(() => {
    const genre = searchParams.get("genre")
    const page = searchParams.get("page") || "1"

    if (genre) {
      handleSearch({
        keyword: "",
        type: "all",
        author: "",
        year: "",
        genre: genre,
        artist: "",
        sort: "default",
        page,
      })
    } else {
      loadBaseArchive(page)
    }
  }, [searchParams])

  const loadBaseArchive = async (page = "1") => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery("archivio completo")

    try {
      const response = await fetch(`/api/manga-search?page=${page}`)
      const data = await response.json()
      setSearchResults(data.results || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error("Error loading base archive:", error)
      setSearchResults([])
      setPagination(null)
    } finally {
      setIsLoading(false)
      setInitialLoadComplete(true)
    }
  }

  const handleSearch = async (params: {
    keyword: string
    type: string
    author: string
    year: string
    genre: string
    artist: string
    sort: string
    page?: string
  }) => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery(params.keyword || params.genre || "filtri applicati")

    try {
      const searchParams = new URLSearchParams()
      if (params.keyword) searchParams.set("keyword", params.keyword)
      if (params.type && params.type !== "all") searchParams.set("type", params.type)
      if (params.author) searchParams.set("author", params.author)
      if (params.year) searchParams.set("year", params.year)
      if (params.genre) searchParams.set("genre", params.genre)
      if (params.artist) searchParams.set("artist", params.artist)
      if (params.sort && params.sort !== "default") searchParams.set("sort", params.sort)
      if (params.page && params.page !== "1") searchParams.set("page", params.page)

      const response = await fetch(`/api/manga-search?${searchParams.toString()}`)
      const data = await response.json()
      setSearchResults(data.results || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error("Error searching manga:", error)
      setSearchResults([])
      setPagination(null)
    } finally {
      setIsLoading(false)
      setInitialLoadComplete(true)
    }
  }

  const navigateToPage = (pageNum: number) => {
    if (!pagination) return

    let targetPage = pageNum

    // Wrap around logic
    if (pageNum > pagination.totalPages) {
      targetPage = 1
    } else if (pageNum < 1) {
      targetPage = pagination.totalPages
    }

    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("page", targetPage.toString())
    router.push(`/search-manga?${newParams.toString()}`)
    router.refresh()
  }

  const PaginationBar = () => {
    if (!pagination) return null

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          onClick={() => navigateToPage(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevious}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 text-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted active:scale-95"
        >
          <ArrowLeft size={20} />
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
            className="w-12 px-2 py-1 text-sm text-center rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">di {pagination.totalPages}</span>
        </div>

        <button
          onClick={() => navigateToPage(pagination.currentPage + 1)}
          disabled={!pagination.hasNext}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 text-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted active:scale-95"
        >
          <ArrowLeft size={20} className="rotate-180" />
        </button>
      </div>
    )
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

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/search-manga" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <div className="rounded-lg bg-neutral-950 text-white p-5">
          <h1 className="text-xl font-bold">Cerca manga</h1>
          <p className="text-xs text-neutral-300 mt-1">Trova capitoli tradotti in ITA e leggili direttamente.</p>
          <div className="mt-3">
            <MangaSearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>

        {isLoading && searchResults.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {hasSearched && !isLoading && searchResults.length === 0 && (
          <div className="text-center py-8">
            <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Nessun risultato</h2>
            <p className="text-muted-foreground">
              Non sono stati trovati manga per "{currentQuery}". Prova con altri filtri.
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {currentQuery === "archivio completo" ? "Archivio manga completo" : `Risultati per "${currentQuery}"`} (
              {searchResults.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.map((manga, index) => (
                <MangaCard key={index} manga={manga} />
              ))}
            </div>

            <PaginationBar />
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Scopri i tuoi manga preferiti</h2>
            <p className="text-muted-foreground mb-4">
              Usa i filtri sopra per cercare manga per titolo, autore, genere e molto altro.
            </p>
            <Link href="/manga" className="flex items-center gap-1 hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Torna alla Homepage Manga
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
