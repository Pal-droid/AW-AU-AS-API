import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MangaHero() {
  console.log("[v0] MangaHero component is rendering")

  return (
    <div className="rounded-lg bg-neutral-950 text-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Leggi manga in italiano</h1>
          <p className="text-xs text-neutral-300 mt-1">
            Scopri migliaia di manga, manhwa e manhua tradotti in italiano.
          </p>
        </div>
        <Link href="/search-manga">
          <Button variant="secondary" size="sm" className="ml-4">
            <Search size={16} className="mr-1" />
            Cerca
          </Button>
        </Link>
      </div>
    </div>
  )
}
