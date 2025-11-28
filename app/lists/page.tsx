"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AuthPanel } from "@/components/auth-panel"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Film, BookOpen, Book } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { obfuscateUrl, obfuscateId } from "@/lib/utils"

type ContentType = "anime" | "manga" | "light-novel" | "series-movies"
type AnimeListName = "da_guardare" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"
type MangaListName = "da_leggere" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"
type ListItem = {
  title: string
  image?: string
  path?: string
  sources?: any[]
}
type ContinueWatchingItem = {
  id: string
  title: string
  image: string
  episodeId: string
}

const ANIME_ORDER: { key: AnimeListName; title: string }[] = [
  { key: "da_guardare", title: "Da guardare" },
  { key: "in_corso", title: "In corso" },
  { key: "completati", title: "Completati" },
  { key: "in_pausa", title: "In pausa" },
  { key: "abbandonati", title: "Abbandonati" },
  { key: "in_revisione", title: "In revisione" },
]

const MANGA_ORDER: { key: MangaListName; title: string }[] = [
  { key: "da_leggere", title: "Da leggere" },
  { key: "in_corso", title: "In corso" },
  { key: "completati", title: "Completati" },
  { key: "in_pausa", title: "In pausa" },
  { key: "abbandonati", title: "Abbandonati" },
  { key: "in_revisione", title: "In revisione" },
]

const CONTENT_TYPES: { key: ContentType; title: string; icon: any }[] = [
  { key: "anime", title: "Anime", icon: Film },
  { key: "manga", title: "Manga", icon: BookOpen },
  { key: "light-novel", title: "Romanzi", icon: Book },
  { key: "series-movies", title: "Serie & Film", icon: Film },
]

// New InfoMessage component
const InfoMessage = () => {
  return (
    <div className="relative glass-card rounded-xl p-6 mb-6 border border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-background">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Informazione sulle Liste</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le liste sono ancora in sviluppo. Come suggerimento temporaneo, ti consigliamo di utilizzare{' '}
            <a
              href="https://anilist.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              AniList
            </a>
            .
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            P.S. In futuro aggiungeremo una feature per integrare la tua lista AniList direttamente nel sito!
          </p>
        </div>
      </div>
    </div>
  )
}

const ListItemCard = ({ itemId, contentType, listName, onRemove, fetchMetadata }) => {
  const [metadata, setMetadata] = useState({ title: itemId, image: null, path: null })
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState([])

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true)
      try {
        const meta = await fetchMetadata()
        setMetadata(meta)
        if (meta.sources) {
          setSources(meta.sources)
        }
      } catch (error) {
        console.error("[v0] Error loading metadata for:", itemId, error)
        setMetadata({ title: itemId, image: null, path: null })
      } finally {
        setLoading(false)
      }
    }
    loadMetadata()
  }, [itemId, contentType, fetchMetadata])

  const getNavigationUrl = () => {
    if (contentType === "anime" || contentType === "series-movies") {
      return `/watch?p=${obfuscateUrl(itemId)}`
    } else if (contentType === "manga" || contentType === "light-novel") {
      return `/manga/${obfuscateId(itemId)}`
    }
    return "#"
  }

  const handleClick = () => {
    if ((contentType === "anime" || contentType === "series-movies") && sources && sources.length > 0) {
      try {
        sessionStorage.setItem(`anizone:sources:${itemId}`, JSON.stringify(sources))
        console.log("[v0] Stored sources in sessionStorage for:", itemId, sources)
      } catch (error) {
        console.error("[v0] Failed to store sources in sessionStorage:", error)
      }
    }
  }

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 hover:glow transition-all duration-300">
      <div className="shrink-0">
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
          {loading ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full rounded" />
          ) : metadata.image ? (
            <Image
              src={
                contentType === "manga" || contentType === "light-novel"
                  ? `/api/manga-image-proxy?url=${encodeURIComponent(metadata.image)}`
                  : metadata.image
              }
              alt={metadata.title}
              width={64}
              height={80}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                target.parentElement!.innerHTML =
                  contentType === "anime" || contentType === "series-movies"
                    ? '<svg class="w-6 h-6"><use href="#film-icon"></use></svg>'
                    : contentType === "manga"
                    ? '<svg class="w-6 h-6"><use href="#book-open-icon"></use></svg>'
                    : '<svg class="w-6 h-6"><use href="#book-icon"></use></svg>'
              }}
            />
          ) : (
            <>
              {contentType === "anime" || contentType === "series-movies" ? (
                <Film size={20} />
              ) : contentType === "manga" ? (
                <BookOpen size={20} />
              ) : (
                <Book size={20} />
              )}
            </>
          )}
        </div>
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
        <Button size="sm" variant="outline" asChild>
          <Link href={getNavigationUrl()} onClick={handleClick}>
            Apri
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove()}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent"
        >
          Rimuovi
        </Button>
      </div>
    </div>
  )
}

export default function ListsPage() {
  const { user } = useAuth()
  const [animeLists, setAnimeLists] = useState<Record<AnimeListName, string[]>>({
    da_guardare: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [mangaLists, setMangaLists] = useState<Record<MangaListName, string[]>>({
    da_leggere: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [lightNovelLists, setLightNovelLists] = useState<Record<MangaListName, string[]>>({
    da_leggere: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [seriesMoviesLists, setSeriesMoviesLists] = useState<Record<AnimeListName, string[]>>({
    da_guardare: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [activeContentType, setActiveContentType] = useState<ContentType>("anime")
  const [listsLoading, setListsLoading] = useState(false)
  const [continueWatchingLoading, setContinueWatchingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ongoingList, setOngoingList] = useState<ContinueWatchingItem[]>([])
  const [episodes, setEpisodes] = useState<Record<string, any[]>>({})
  const [sources, setSources] = useState<Record<string, any[]>>({})

  // Memoize in_corso lists to prevent unnecessary useEffect triggers
  const memoizedAnimeInCorso = useMemo(() => animeLists.in_corso, [animeLists.in_corso])
  const memoizedSeriesInCorso = useMemo(() => seriesMoviesLists.in_corso, [seriesMoviesLists.in_corso])

  async function loadLists() {
    if (!user?.token) return
    setListsLoading(true)
    setError(null)
    try {
      console.log("[v0] Loading lists for user:", user.username)
      // Anime
      const animeResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/anime-lists", {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (animeResponse.ok) setAnimeLists(await animeResponse.json())
      // Manga
      const mangaResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/manga-lists", {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (mangaResponse.ok) setMangaLists(await mangaResponse.json())
      // Light novels
      const lightNovelResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/lightnovel-lists",
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      if (lightNovelResponse.ok) setLightNovelLists(await lightNovelResponse.json())
      // Series & movies
      const seriesMoviesResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/series-movies-lists",
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      if (seriesMoviesResponse.ok) setSeriesMoviesLists(await seriesMoviesResponse.json())
    } catch (error) {
      console.error("[v0] Error loading lists:", error)
      setError("Errore durante il caricamento delle liste. Riprova più tardi.")
    } finally {
      setListsLoading(false)
    }
  }

  async function loadContinueWatching() {
    if (!user?.token) return
    setContinueWatchingLoading(true)
    setError(null)
    try {
      const ongoingAnime = memoizedAnimeInCorso || []
      const ongoingSeriesMovies = memoizedSeriesInCorso || []
      const ongoingItems: ContinueWatchingItem[] = []
      for (const itemId of [...ongoingAnime, ...ongoingSeriesMovies]) {
        const response = await fetch(`/api/anime-meta?path=${encodeURIComponent(itemId)}`)
        if (response.ok) {
          const data = await response.json()
          const episodeId = "1" // Placeholder: Adjust based on actual episode tracking logic
          ongoingItems.push({
            id: itemId,
            title: data.meta?.title || itemId,
            image: data.meta?.image || "/placeholder.png",
            episodeId,
          })
          // Fetch sources
          try {
            const sourcesResponse = await fetch(`/api/unified-search?keyword=${encodeURIComponent(itemId)}`)
            if (sourcesResponse.ok) {
              const sourcesData = await sourcesResponse.json()
              if (sourcesData.ok && sourcesData.items && sourcesData.items.length > 0) {
                const matchingItem = sourcesData.items.find((item) => {
                  const itemPath = item.href.replace(/^\/anime\//, "").replace(/\/$/, "")
                  return itemPath === itemId || item.href.includes(itemId)
                })
                if (matchingItem && matchingItem.sources) {
                  setSources((prev) => ({ ...prev, [itemId]: matchingItem.sources }))
                }
              }
            }
          } catch (error) {
            console.error("[ContinueWatching] Failed to fetch sources:", error)
          }
          // Fetch episodes
          try {
            const episodesResponse = await fetch(`/api/anime-episodes?path=${encodeURIComponent(itemId)}`)
            if (episodesResponse.ok) {
              const data = await episodesResponse.json()
              setEpisodes((prev) => ({ ...prev, [itemId]: data.episodes || [] }))
            }
          } catch (error) {
            console.error("[ContinueWatching] Failed to fetch episodes:", error)
          }
        }
      }
      setOngoingList(ongoingItems)
    } catch (error) {
      console.error("[ContinueWatching] Error loading continue watching:", error)
      setError("Errore durante il caricamento di Continua a guardare. Riprova più tardi.")
    } finally {
      setContinueWatchingLoading(false)
    }
  }

  useEffect(() => {
    if (user?.token) {
      loadLists()
    }
  }, [user?.token])

  useEffect(() => {
    if (user?.token) {
      loadContinueWatching()
    }
  }, [user?.token, memoizedAnimeInCorso, memoizedSeriesInCorso])

  async function removeFromList(contentType: ContentType, listName: string, title: string) {
    if (!user?.token) return
    try {
      let endpoint = ""
      let currentLists: any = {}
      switch (contentType) {
        case "anime":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/anime-lists"
          currentLists = { ...animeLists }
          break
        case "manga":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/manga-lists"
          currentLists = { ...mangaLists }
          break
        case "light-novel":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/lightnovel-lists"
          currentLists = { ...lightNovelLists }
          break
        case "series-movies":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/series-movies-lists"
          currentLists = { ...seriesMoviesLists }
          break
      }
      if (currentLists[listName]) currentLists[listName] = currentLists[listName].filter((item: string) => item !== title)
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(currentLists),
      })
      if (response.ok) {
        switch (contentType) {
          case "anime":
            setAnimeLists(currentLists)
            break
          case "manga":
            setMangaLists(currentLists)
            break
          case "light-novel":
            setLightNovelLists(currentLists)
            break
          case "series-movies":
            setSeriesMoviesLists(currentLists)
            break
        }
      }
    } catch (error) {
      console.error("[v0] Error removing from list:", error)
      setError("Errore durante la rimozione dalla lista. Riprova più tardi.")
    }
  }

  const fetchItemMetadata = async (contentType: ContentType, itemId: string) => {
    try {
      if (contentType === "anime" || contentType === "series-movies") {
        const response = await fetch(`/api/anime-meta?path=${encodeURIComponent(itemId)}`)
        if (response.ok) {
          const data = await response.json()
          let sources = []
          try {
            const sourcesResponse = await fetch(`/api/unified-search?keyword=${encodeURIComponent(itemId)}`)
            if (sourcesResponse.ok) {
              const sourcesData = await sourcesResponse.json()
              if (sourcesData.ok && sourcesData.items && sourcesData.items.length > 0) {
                const matchingAnime = sourcesData.items.find((item) => {
                  const itemPath = item.href.replace(/^\/anime\//, "").replace(/\/$/, "")
                  return itemPath === itemId || item.href.includes(itemId)
                })
                if (matchingAnime && matchingAnime.sources) sources = matchingAnime.sources
              }
            }
          } catch {}
          return { title: data.meta?.title || itemId, image: data.meta?.image, path: data.meta?.path || `/anime/${itemId}`, sources }
        }
      } else if (contentType === "manga" || contentType === "light-novel") {
        const response = await fetch(`/api/manga-info?id=${encodeURIComponent(itemId)}`)
        if (response.ok) {
          const data = await response.json()
          return { title: data.title || itemId, image: data.image, path: `/manga/${itemId}` }
        } else {
          return { title: itemId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), image: null, path: `/manga/${itemId}` }
        }
      }
    } catch {}
    return {
      title: itemId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      image: null,
      path: contentType === "anime" || contentType === "series-movies" ? `/anime/${itemId}` : `/manga/${itemId}`,
      sources: [],
    }
  }

  const renderList = (contentType: ContentType, listName: string) => {
    let items: string[] = []
    switch (contentType) {
      case "anime":
        items = animeLists[listName as AnimeListName] || []
        break
      case "manga":
        items = mangaLists[listName as MangaListName] || []
        break
      case "light-novel":
        items = lightNovelLists[listName as MangaListName] || []
        break
      case "series-movies":
        items = seriesMoviesLists[listName as AnimeListName] || []
        break
    }
    if (items.length === 0) return <div className="text-sm text-muted-foreground">Nessun elemento.</div>

    return (
      <div className="grid grid-cols-1 gap-3">
        {items.map((itemId, index) => (
          <ListItemCard
            key={`${itemId}-${index}`}
            itemId={itemId}
            contentType={contentType}
            listName={listName}
            onRemove={() => removeFromList(contentType, listName, itemId)}
            fetchMetadata={() => fetchItemMetadata(contentType, itemId)}
          />
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen">
        <SlideOutMenu currentPath="/lists" />
        <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="px-4 py-3">
            <h1 className="text-lg font-bold">Le mie liste</h1>
          </div>
        </header>
        <section className="px-4 py-4 space-y-6">
          <AuthPanel onAuthChange={loadLists} />
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Effettua il login per vedere le tue liste.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/lists" />
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">Le mie liste</h1>
        </div>
      </header>
      <section className="px-4 py-4 space-y-6">
        <AuthPanel onAuthChange={loadLists} />
        <InfoMessage /> {/* Added the InfoMessage component here */}
        {(listsLoading || continueWatchingLoading) ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Caricamento liste...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <div className="mt-4 flex justify-center">
                <Button onClick={() => { loadLists(); loadContinueWatching(); }}>Riprova</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {ongoingList.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Continua a guardare</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {ongoingList.map((item) => {
                      const episodeData = episodes[item.id] || []
                      const currentEpisode = episodeData.find((ep: any) => ep.id === item.episodeId)
                      return (
                        <Link
                          key={item.id}
                          href={`/watch?p=${obfuscateUrl(item.id)}&e=${item.episodeId}`}
                          onClick={() => {
                            if (sources[item.id]) {
                              try {
                                sessionStorage.setItem(`anizone:sources:${item.id}`, JSON.stringify(sources[item.id]))
                              } catch (error) {
                                console.error("[ContinueWatching] Failed to store sources:", error)
                              }
                            }
                          }}
                          className="block"
                        >
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md hover:glow transition-all duration-300">
                            <Image src={item.image} alt={item.title} fill className="object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                              <p className="truncate">{item.title}</p>
                              {currentEpisode && <p className="text-gray-300">Ep {currentEpisode.number}</p>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            <Tabs
              value={activeContentType}
              onValueChange={(value) => setActiveContentType(value as ContentType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                {CONTENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                      <Icon size={16} />
                      <span className="hidden sm:inline">{type.title}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {CONTENT_TYPES.map((type) => (
                <TabsContent key={type.key} value={type.key} className="space-y-6">
                  {(type.key === "anime" || type.key === "series-movies" ? ANIME_ORDER : MANGA_ORDER).map((list) => (
                    <Card key={list.key} className="glass-card">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{list.title}</CardTitle>
                      </CardHeader>
                      <CardContent>{renderList(type.key, list.key)}</CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </section>
    </main>
  )
}
