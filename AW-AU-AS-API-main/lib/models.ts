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
