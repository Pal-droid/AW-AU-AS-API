import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const popularGenres = [
  { name: "Azione", slug: "azione" },
  { name: "Avventura", slug: "avventura" },
  { name: "Commedia", slug: "commedia" },
  { name: "Drammatico", slug: "drammatico" },
  { name: "Fantasy", slug: "fantasy" },
  { name: "Romance", slug: "romance" },
  { name: "Slice of Life", slug: "slice-of-life" },
  { name: "Soprannaturale", slug: "soprannaturale" },
]

export function MangaGenres() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Esplora per Genere</h2>
      <div className="flex flex-wrap gap-2">
        {popularGenres.map((genre) => (
          <Link key={genre.slug} href={`/search-manga?genre=${genre.slug}`}>
            <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors">
              {genre.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
