import { type NextRequest, NextResponse } from "next/server"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://www.mangaworld.cx/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "manual", // Handle redirects manually
    })

    // If successful, return the response
    if (response.ok) {
      return response
    }

    // Handle redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header`)
      }

      // Make location absolute if it's relative
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString()
      console.log(`[v0] Following redirect to: ${currentUrl}`)
      continue
    }

    // If not a redirect and not successful, throw error
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

export async function GET(request: NextRequest) {
  try {
    if (!request.nextUrl) {
      return NextResponse.json({ error: "Invalid request URL" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    console.log("[v0] Proxying manga image:", imageUrl)

    const response = await fetchWithRedirects(imageUrl)

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const imageBuffer = await response.arrayBuffer()

    console.log("[v0] Successfully proxied image, size:", imageBuffer.byteLength, "bytes")

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("[v0] Error proxying manga image:", error)
    return NextResponse.json(
      { error: "Failed to proxy image", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
