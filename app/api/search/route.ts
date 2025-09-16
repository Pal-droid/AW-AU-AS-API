import { type NextRequest, NextResponse } from "next/server"
import { AnimeWorldScraper, AnimeSaturnScraper } from "@/lib/scrapers"
import { detectDuplicates } from "@/lib/utils-anime"

export async function GET(request: NextRequest) {
console.log("[v0] Search endpoint called, request object:", !!request)

if (!request) {
console.log("[v0] Request object is undefined")
return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}

if (!request.nextUrl) {
console.log("[v0] Request nextUrl is undefined")
return NextResponse.json({ error: "Invalid request URL" }, { status: 400 })
}

const searchParams = request.nextUrl.searchParams
const query = searchParams.get("q")

console.log("[v0] Search endpoint called with query: '${query}'")

if (!query || query.trim().length < 2) {
console.log("[v0] Query too short, returning error")
return NextResponse.json({ error: "Query must be at least 2 characters long" }, { status: 400 })
}

try {
console.log("[v0] Starting concurrent scraping tasks")
const animeworldScraper = new AnimeWorldScraper()
const animesaturnScraper = new AnimeSaturnScraper()

// Scrape from both sources concurrently  
const [animeworldResults, animesaturnResults] = await Promise.allSettled([  
  animeworldScraper.search(query),  
  animesaturnScraper.search(query),  
])  

console.log(`[v0] Raw results from scrapers:`, { animeworldResults, animesaturnResults })  

const awResults = animeworldResults.status === "fulfilled" ? animeworldResults.value : []  
const asResults = animesaturnResults.status === "fulfilled" ? animesaturnResults.value : []  

console.log(`[v0] AnimeWorld results count: ${awResults.length}`)  
console.log(`[v0] AnimeSaturn results count: ${asResults.length}`)  
console.log(`[v0] AnimeWorld results:`, awResults)  
console.log(`[v0] AnimeSaturn results:`, asResults)  

// Combine and deduplicate results  
const unifiedResults = detectDuplicates(awResults, asResults)  
console.log(`[v0] Unified results after deduplication:`, unifiedResults)  
console.log(`[v0] Final unified results count: ${unifiedResults.length}`)  

return NextResponse.json(unifiedResults)

} catch (error) {
console.log([v0] Exception in search endpoint: ${error})
return NextResponse.json({ error: Search failed: ${error} }, { status: 500 })
}
}

