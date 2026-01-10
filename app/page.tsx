export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-3 text-foreground">Media Scraper API</h1>
          <p className="text-lg text-muted-foreground">
            A Next.js API for scraping anime and manga data from multiple sources.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Anime Section */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <span className="text-xl">📺</span> Anime
            </h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Sources</h3>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-foreground">AnimeWorld</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AW</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-foreground">AnimeSaturn</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AS</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-foreground">AnimePahe</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AP</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-foreground">AnimeUnity</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AU</code>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Endpoints</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/search?q=naruto
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/episodes?AW=id&AS=id&AP=session
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/stream?AW=id&AS=id&AP=session
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/seasons?AW=id&AS=id
                  </code>
                </li>
              </ul>
            </div>
          </section>

          {/* Manga Section */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <span className="text-xl">📚</span> Manga
            </h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Sources</h3>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  <span className="text-foreground">Comix</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">CX</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span className="text-foreground">MangaWorld</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">MW</code>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Endpoints</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/manga/search?q=one+piece
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/manga/chapters?CX=hash&MW=id/slug
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded text-foreground block break-all">
                    /api/manga/pages?CX=hash/slug/id/num&MW=url
                  </code>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Features Section */}
        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">Features</h2>
          <ul className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Multi-source aggregation with duplicate detection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Japanese title (jtitle) fallback matching</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Season and ordinal normalization (Roman, ordinals, multi-language)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Automatic HTML entity decoding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Fuzzy title similarity matching (Levenshtein)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>CDN-optimized caching headers</span>
            </li>
          </ul>
        </section>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js • <code className="bg-muted px-1.5 py-0.5 rounded">/api</code> for API info
          </p>
        </footer>
      </div>
    </div>
  )
}
