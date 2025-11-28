"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FuelIcon as FunnelIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"

const TYPE_LABELS: Record<string, string> = {
  all: "Qualsiasi",
  Doujinshi: "Doujinshi",
  Manga: "Manga",
  Manhua: "Manhua",
  Manhwa: "Manhwa",
  Oneshot: "Oneshot",
  Thai: "Thai",
  Vietnamita: "Vietnamita",
}

const SORT_LABELS: Record<string, string> = {
  default: "Standard",
  newest: "Più recenti",
  oldest: "Più vecchi",
  most_read: "Più letti",
  less_read: "Meno letti",
  "a-z": "A-Z",
  "z-a": "Z-A",
}

// Common manga genres for quick search
const QUICK_GENRES = [
  { label: "Azione", value: "azione" },
  { label: "Avventura", value: "avventura" },
  { label: "Commedia", value: "commedia" },
  { label: "Romance", value: "romance" },
  { label: "Fantasy", value: "fantasy" },
  { label: "Slice of Life", value: "slice-of-life" },
  { label: "Horror", value: "horror" },
  { label: "Sci-Fi", value: "sci-fi" },
  { label: "Drammatico", value: "drammatico" },
  { label: "Soprannaturale", value: "soprannaturale" },
]

function Chip({
  label,
  onClear,
}: {
  label: string
  onClear: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-white dark:bg-neutral-800">
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={`Rimuovi filtro ${label}`}
        className="p-0.5 -mr-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
        onClick={onClear}
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  )
}

interface MangaSearchFormProps {
  onSearch: (params: {
    keyword: string
    type: string
    author: string
    year: string
    genre: string
    artist: string
    sort: string
    page?: string
  }) => void
  isLoading?: boolean
}

export function MangaSearchForm({ onSearch, isLoading = false }: MangaSearchFormProps) {
  // Basic search parameters
  const [keyword, setKeyword] = useState("")
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("default")

  // Advanced filters
  const [author, setAuthor] = useState("")
  const [artist, setArtist] = useState("")
  const [year, setYear] = useState("")
  const [genre, setGenre] = useState("")

  function applyGenreFilter(genreValue: string) {
    setGenre(genreValue)

    // Auto-submit with the new genre
    onSearch({
      keyword,
      type,
      author,
      year,
      genre: genreValue,
      artist,
      sort,
      page: "1",
    })
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSearch({
      keyword,
      type,
      author,
      year,
      genre,
      artist,
      sort,
      page: "1",
    })
  }

  const hasAnyFilter = type !== "all" || author || artist || year || genre || sort !== "default"

  function clearAll() {
    setType("all")
    setAuthor("")
    setArtist("")
    setYear("")
    setGenre("")
    setSort("default")
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-3">
      {/* Quick genre search */}
      <div className="space-y-2">
        <Label>Ricerche rapide per genere</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_GENRES.map((genreItem) => (
            <button
              key={genreItem.value}
              type="button"
              onClick={() => applyGenreFilter(genreItem.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                genre === genreItem.value
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black"
                  : "bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
              }`}
            >
              {genreItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main search row */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-stretch">
        <Input
          name="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cerca manga (es. One Piece)"
          aria-label="Parola chiave"
          className="w-full min-w-0"
        />
        <div className="flex gap-2 items-stretch justify-end min-w-0">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[120px] min-w-0 shrink-0" aria-label="Tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="shrink-0 whitespace-nowrap" aria-label="Cerca" disabled={isLoading}>
            <SearchIcon className="h-4 w-4 mr-2" />
            Cerca
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasAnyFilter && (
        <div className="flex flex-wrap gap-2">
          {type !== "all" && <Chip label={`Tipo: ${TYPE_LABELS[type] || type}`} onClear={() => setType("all")} />}
          {author && <Chip label={`Autore: ${author}`} onClear={() => setAuthor("")} />}
          {artist && <Chip label={`Artista: ${artist}`} onClear={() => setArtist("")} />}
          {year && <Chip label={`Anno: ${year}`} onClear={() => setYear("")} />}
          {genre && <Chip label={`Genere: ${genre}`} onClear={() => setGenre("")} />}
          {sort !== "default" && (
            <Chip label={`Ordine: ${SORT_LABELS[sort] || sort}`} onClear={() => setSort("default")} />
          )}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={clearAll}>
            Pulisci tutto
          </button>
        </div>
      )}

      {/* Advanced filters */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" type="button" className="w-full sm:w-auto bg-transparent">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filtri avanzati
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Author */}
          <div className="space-y-1">
            <Label>Autore</Label>
            <Input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Es. Eiichiro Oda"
            />
          </div>

          {/* Artist */}
          <div className="space-y-1">
            <Label>Artista</Label>
            <Input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Es. Takeshi Obata"
            />
          </div>

          {/* Year */}
          <div className="space-y-1">
            <Label>Anno</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Es. 2020"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>

          {/* Genre */}
          <div className="space-y-1">
            <Label>Genere personalizzato</Label>
            <Input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Es. arti-marziali"
            />
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <Label>Ordine</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue placeholder="Standard" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  )
}
