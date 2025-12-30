export interface AnimeSource {
  name: string
  url: string
  id: string
}

export interface SearchResult {
  title: string
  description?: string
  images: {
    poster?: string
    cover?: string
  }
  sources: AnimeSource[]
  has_multi_servers: boolean
}

export interface EpisodeSource {
  available: boolean
  url?: string
  id?: string
  animeSession?: string
}

export interface EpisodeResult {
  episode_number: number
  sources: Record<string, EpisodeSource>
}

export interface StreamSource {
  available: boolean
  stream_url?: string
  embed?: string
  provider?: string
}

export interface StreamResult {
  AnimeWorld: StreamSource
  AnimeSaturn: StreamSource
  AnimePahe?: StreamSource
  Unity?: StreamSource
  Heaven?: StreamSource // Added Heaven to StreamResult
}

export interface SeasonEpisodeSource {
  available: boolean
  url?: string
  id?: string
}

export interface SeasonEpisode {
  episode_number: number
  sources: Record<string, SeasonEpisodeSource>
}

export interface SeasonResult {
  AnimeWorld: SeasonEpisode[]
  AnimeSaturn: Record<string, SeasonEpisode[]> // Season keys like "S1", "S2", etc.
}

export interface MangaSource {
  name: string
  url?: string
  id: string
  hash_id?: string
  slug?: string
}

export interface MangaSearchResult {
  title: string
  description?: string
  images: {
    poster?: string
  }
  sources: MangaSource[]
  status?: string
  type?: string
  author?: string
  genres?: string[]
}

export interface ChapterSource {
  available: boolean
  id?: string
  url?: string
  title?: string
  date?: string
}

export interface ChapterResult {
  chapter_number: number
  sources: Record<string, ChapterSource>
}

export interface PageResult {
  page_number: number
  url: string
}
