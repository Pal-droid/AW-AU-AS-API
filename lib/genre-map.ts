export type GenreInfo = {
  id: number
  name: string
  slug: string
}

export const GENRES: GenreInfo[] = [
  { id: 1, name: "Azione", slug: "action" },
  { id: 2, name: "Avventura", slug: "adventure" },
  { id: 3, name: "Arti Marziali", slug: "arti-marziali" },
  { id: 4, name: "Commedia", slug: "commedia" },
  { id: 5, name: "Avanguardia", slug: "avanguardia" },
  { id: 6, name: "Demoni", slug: "demoni" },
  { id: 7, name: "Drammatico", slug: "drama" },
  { id: 8, name: "Ecchi", slug: "ecchi" },
  { id: 9, name: "Fantasy", slug: "fantasy" },
  { id: 10, name: "Gioco", slug: "game" },
  { id: 11, name: "Harem", slug: "harem" },
  { id: 12, name: "Storico", slug: "historical" },
  { id: 13, name: "Horror", slug: "horror" },
  { id: 14, name: "Josei", slug: "josei" },
  { id: 16, name: "Magia", slug: "magic" },
  { id: 18, name: "Mecha", slug: "mecha" },
  { id: 19, name: "Militari", slug: "military" },
  { id: 20, name: "Musicale", slug: "music" },
  { id: 21, name: "Mistero", slug: "mistery" },
  { id: 22, name: "Parodia", slug: "parody" },
  { id: 23, name: "Polizia", slug: "police" },
  { id: 24, name: "Psicologico", slug: "psychological" },
  { id: 25, name: "Sentimentale", slug: "sentimental" },
  { id: 26, name: "Samurai", slug: "samurai" },
  { id: 27, name: "Scolastico", slug: "school" },
  { id: 28, name: "Sci-Fi", slug: "sci-fi" },
  { id: 29, name: "Seinen", slug: "seinen" },
  { id: 30, name: "Shoujo", slug: "shoujo" },
  { id: 31, name: "Shoujo Ai", slug: "shoujo-ai" },
  { id: 32, name: "Shounen", slug: "shounen" },
  { id: 33, name: "Shounen Ai", slug: "shounen-ai" },
  { id: 34, name: "Slice of Life", slug: "slice-of-life" },
  { id: 35, name: "Spazio", slug: "space" },
  { id: 36, name: "Sport", slug: "sports" },
  { id: 37, name: "Soprannaturale", slug: "supernatural" },
  { id: 38, name: "Superpoteri", slug: "super-power" },
  { id: 39, name: "Thriller", slug: "thriller" },
  { id: 40, name: "Vampiri", slug: "vampire" },
  { id: 41, name: "Yaoi", slug: "yaoi" },
  { id: 42, name: "Yuri", slug: "yuri" },
  { id: 43, name: "Hentai", slug: "hentai" },
  { id: 46, name: "Romantico", slug: "romance" },
  { id: 47, name: "Bambini", slug: "bambini" },
  { id: 48, name: "Veicoli", slug: "veicoli" },
]

// Helper lookups
export const GENRE_BY_NAME = Object.fromEntries(GENRES.map((g) => [g.name.toLowerCase(), g]))
export const GENRE_BY_SLUG = Object.fromEntries(GENRES.map((g) => [g.slug.toLowerCase(), g]))
export const GENRE_BY_ID = Object.fromEntries(GENRES.map((g) => [String(g.id), g]))
