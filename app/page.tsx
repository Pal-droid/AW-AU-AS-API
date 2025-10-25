export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Anime Scraper API</h1>
      <p className="text-lg mb-4">A Next.js API for scraping anime data from multiple sources.</p>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Available Endpoints:</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">/api</code> - API info
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">/api/search?q=naruto</code> - Search anime
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/episodes?AW=anime-id&AS=anime-id&AP=anime-session&AU=anime-id
              </code>{" "}
              - Get episodes
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/stream?AW=episode-id&AS=episode-id&AP=episode-session&AP_ANIME=anime-session&AU=episode-id
              </code>{" "}
              - Get stream URLs
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">/api/seasons?AW=anime-id&AS=anime-id</code> - Get seasons
            </li>
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-2">Supported Sources:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>AnimeWorld (AW)</li>
            <li>AnimeSaturn (AS)</li>
            <li>AnimePahe (AP)</li>
            <li>AniUnity (AU)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
