import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function DiscoverSections() {
  const quickTopics: { label: string; genreId: string }[] = [
    { label: "Azione", genreId: "1" },
    { label: "Avventura", genreId: "2" },
    { label: "Commedia", genreId: "4" },
    { label: "Romance", genreId: "46" },
    { label: "Fantasy", genreId: "9" },
    { label: "Isekai", genreId: "9" }, // Fantasy is closest to Isekai
    { label: "Slice of Life", genreId: "34" },
    { label: "Mecha", genreId: "18" },
    { label: "Sport", genreId: "36" },
    { label: "Horror", genreId: "13" },
  ]

  const quickFilters: { label: string; href: string }[] = [
    { label: "Doppiato ITA", href: "/search?dub=1" },
    { label: "Sub ITA", href: "/search?dub=0" },
    { label: "Novità 2024+", href: "/search?year=2024" },
    { label: "In corso", href: "/search?status=0" },
  ]

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Ricerche rapide</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickTopics.map((t) => (
            <Link key={t.label} href={`/search?genre=${t.genreId}`}>
              <Badge variant="secondary" className="cursor-pointer">
                {t.label}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Filtri veloci</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickFilters.map((f) => (
            <Link key={f.label} href={f.href}>
              <Badge variant="secondary" className="cursor-pointer">
                {f.label}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
