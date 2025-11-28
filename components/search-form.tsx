"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilterIcon as FunnelIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { GENRES, GENRE_BY_ID } from "@/lib/genre-map"

const SEASON_LABELS: Record<string, string> = {
  winter: "Inverno",
  spring: "Primavera",
  summer: "Estate",
  fall: "Autunno",
  unknown: "Sconosciuta",
}

const LANGUAGE_LABELS: Record<string, string> = {
  jp: "Giapponese",
  it: "Italiano",
  en: "Inglese",
  ch: "Cinese",
  kr: "Coreano",
}

const STATUS_LABELS: Record<string, string> = {
  "0": "In corso",
  "1": "Finito",
  "2": "Non rilasciato",
  "3": "Droppato",
  "4": "Sconosciuto",
}

const TYPE_LABELS: Record<string, string> = {
  "0": "Qualsiasi",
  "1": "Movie",
  "2": "OVA",
  "3": "ONA",
  "4": "Special",
  "5": "Music",
}

const SORT_LABELS: Record<string, string> = {
  "0": "Standard",
  "1": "Ultime aggiunte",
  "2": "Lista A-Z",
  "3": "Lista Z-A",
  "4": "Più vecchi",
  "5": "Più recenti",
  "6": "Più visti",
  "7": "Meglio valutati",
}

const QUICK_TOPICS: { label: string; genreId: string }[] = [
  { label: "Azione", genreId: "1" },
  { label: "Avventura", genreId: "2" },
  { label: "Commedia", genreId: "4" },
  { label: "Romance", genreId: "46" },
  { label: "Fantasy", genreId: "9" },
  { label: "Slice of Life", genreId: "34" },
  { label: "Mecha", genreId: "18" },
  { label: "Sport", genreId: "36" },
  { label: "Horror", genreId: "13" },
  { label: "Sci-Fi", genreId: "28" },
]

interface ChipProps {
  label: string
  onClear: () => void
}

function Chip({ label, onClear }: ChipProps) {
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

export function SearchForm() {
  const router = useRouter()
  const sp = useSearchParams()

  const [keyword, setKeyword] = useState(sp.get("keyword") || "")
  const [dub, setDub] = useState(sp.get("dub") || "any")
  const [type, setType] = useState(sp.get("type") || "0")
  const [sort, setSort] = useState(sp.get("sort") || "0")
  const [seasons, setSeasons] = useState<string[]>(sp.getAll("season") || [])
  const [languages, setLanguages] = useState<string[]>(sp.getAll("language") || [])
  const [statuses, setStatuses] = useState<string[]>(sp.getAll("status") || [])
  const [genres, setGenres] = useState<string[]>(
    sp.getAll("genre").map((g) => String(g)).filter(Boolean)
  )
  const [yearsInput, setYearsInput] = useState(sp.getAll("year").join(","))
  const [studiosInput, setStudiosInput] = useState(sp.getAll("studio").join(","))

  const toggleIn = <T extends string>(arr: T[], value: T) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const buildSearchParams = () => {
    const params = new URLSearchParams()
    if (keyword.trim()) params.set("keyword", keyword.trim())
    if (dub !== "any") params.set("dub", dub)
    if (type !== "0") params.set("type", type)
    if (sort !== "0") params.set("sort", sort)
    seasons.forEach((s) => params.append("season", s))
    languages.forEach((l) => params.append("language", l))
    statuses.forEach((st) => params.append("status", st))
    yearsInput
      .split(",")
      .map((y) => y.trim())
      .filter(Boolean)
      .forEach((y) => params.append("year", y))
    studiosInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => params.append("studio", s))
    genres.forEach((g) => params.append("genre", g))
    return params
  }

  const applyFilter = () => {
    router.push(`/search?${buildSearchParams().toString()}`)
  }

  const applyGenreFilter = (genreId: string) => {
    setGenres(toggleIn(genres, genreId))
    applyFilter()
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    applyFilter()
  }

  const clearAll = () => {
    setKeyword("")
    setDub("any")
    setType("0")
    setSort("0")
    setSeasons([])
    setLanguages([])
    setStatuses([])
    setYearsInput("")
    setStudiosInput("")
    setGenres([])
    router.push("/search")
  }

  const hasAnyFilter =
    keyword.trim() ||
    dub !== "any" ||
    type !== "0" ||
    sort !== "0" ||
    seasons.length > 0 ||
    languages.length > 0 ||
    statuses.length > 0 ||
    yearsInput.trim().length > 0 ||
    studiosInput.trim().length > 0 ||
    genres.length > 0

  const genreLabels = genres.map((id) => GENRE_BY_ID[id]?.name || `Genere ${id}`)

  return (
    <form onSubmit={onSubmit} className="w-full space-y-3">
      <div className="space-y-2">
        <Label>Ricerche rapide</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic.genreId}
              type="button"
              onClick={() => applyGenreFilter(topic.genreId)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                genres.includes(topic.genreId)
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black"
                  : "bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-stretch">
        <Input
          name="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cerca anime (es. Naruto)"
          aria-label="Parola chiave"
          className="w-full min-w-0"
        />
        <div className="flex gap-2 items-stretch justify-end min-w-0">
          <Select value={dub} onValueChange={setDub}>
            <SelectTrigger
              className="w-[140px] min-w-0 shrink-0"
              aria-label="Doppiaggio"
            >
              <SelectValue placeholder="Doppiaggio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualsiasi</SelectItem>
              <SelectItem value="0">Sub ITA</SelectItem>
              <SelectItem value="1">Doppiato ITA</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            className="shrink-0 whitespace-nowrap"
            aria-label="Cerca"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            Cerca
          </Button>
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex flex-wrap gap-2">
          {keyword.trim() && (
            <Chip
              label={`Parola: ${keyword}`}
              onClear={() => setKeyword("")}
            />
          )}
          {dub !== "any" && (
            <Chip
              label={dub === "1" ? "Doppiato ITA" : "Sub ITA"}
              onClear={() => setDub("any")}
            />
          )}
          {type !== "0" && (
            <Chip
              label={`Tipo: ${TYPE_LABELS[type]}`}
              onClear={() => setType("0")}
            />
          )}
          {sort !== "0" && (
            <Chip
              label={`Ordine: ${SORT_LABELS[sort]}`}
              onClear={() => setSort("0")}
            />
          )}
          {seasons.map((s) => (
            <Chip
              key={s}
              label={`Stagione: ${SEASON_LABELS[s]}`}
              onClear={() => setSeasons((a) => a.filter((x) => x !== s))}
            />
          ))}
          {languages.map((l) => (
            <Chip
              key={l}
              label={`Lingua: ${LANGUAGE_LABELS[l]}`}
              onClear={() => setLanguages((a) => a.filter((x) => x !== l))}
            />
          ))}
          {statuses.map((st) => (
            <Chip
              key={st}
              label={`Stato: ${STATUS_LABELS[st]}`}
              onClear={() => setStatuses((a) => a.filter((x) => x !== st))}
            />
          ))}
          {yearsInput
            .split(",")
            .map((y) => y.trim())
            .filter(Boolean)
            .map((y) => (
              <Chip
                key={y}
                label={`Anno: ${y}`}
                onClear={() =>
                  setYearsInput(
                    yearsInput
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .filter((p) => p !== y)
                      .join(",")
                  )
                }
              />
            ))}
          {studiosInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => (
              <Chip
                key={s}
                label={`Studio: ${s}`}
                onClear={() =>
                  setStudiosInput(
                    studiosInput
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .filter((p) => p !== s)
                      .join(",")
                  )
                }
              />
            ))}
          {genreLabels.map((gl, i) => (
            <Chip
              key={`${gl}-${i}`}
              label={gl}
              onClear={() => setGenres((a) => a.filter((_, idx) => idx !== i))}
            />
          ))}
          <button
            type="button"
            className="text-xs underline text-muted-foreground"
            onClick={clearAll}
          >
            Pulisci tutto
          </button>
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className="w-full sm:w-auto bg-transparent"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filtri avanzati
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Stagioni</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SEASON_LABELS).map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setSeasons((a) => toggleIn(a, val))}
                  className={`px-2 py-1 rounded border text-xs ${
                    seasons.includes(val)
                      ? "bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"
                      : "bg-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Qualsiasi" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Stato</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setStatuses((a) => toggleIn(a, val))}
                  className={`px-2 py-1 rounded border text-xs ${
                    statuses.includes(val)
                      ? "bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"
                      : "bg-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Lingue</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setLanguages((a) => toggleIn(a, val))}
                  className={`px-2 py-1 rounded border text-xs ${
                    languages.includes(val)
                      ? "bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"
                      : "bg-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Anni (separati da virgola)</Label>
            <Input
              type="text"
              value={yearsInput}
              onChange={(e) => setYearsInput(e.target.value)}
              placeholder="Es. 1966, 1999, 2024"
            />
          </div>

          <div className="space-y-1">
            <Label>Studi (separati da virgola)</Label>
            <Input
              type="text"
              value={studiosInput}
              onChange={(e) => setStudiosInput(e.target.value)}
              placeholder="Es. Bee Media, CloverWorks"
            />
          </div>

          <div className="space-y-1">
            <Label>Ordine</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue placeholder="Standard" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>Generi (filtri avanzati)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {GENRES.map((g) => {
                const idStr = String(g.id ?? "")
                const selected = genres.includes(idStr)
                return (
                  <button
                    type="button"
                    key={`${g.slug}-${g.id ?? g.slug}`}
                    onClick={() => {
                      if (!idStr) return
                      setGenres((a) => toggleIn(a, idStr))
                    }}
                    className={`text-left px-2 py-1 rounded border text-xs truncate ${
                      selected
                        ? "bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"
                        : "bg-transparent"
                    }`}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  )
}
