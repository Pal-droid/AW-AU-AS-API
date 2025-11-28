export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return new Response("Missing url parameter", { status: 400 })
    }

    console.log("[v0] Proxying m3u8 stream:", url)

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.animesaturn.cx/",
        Origin: "https://www.animesaturn.cx",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      console.log("[v0] Failed to fetch m3u8:", response.status, response.statusText)
      return new Response(`Failed to fetch m3u8: ${response.status}`, { status: response.status })
    }

    const content = await response.text()
    console.log("[v0] Successfully proxied m3u8 content, length:", content.length)

    const contentType = response.headers.get("content-type") || ""

    // Check if we received HTML instead of M3U8
    if (
      content.trim().toLowerCase().startsWith("<!doctype html") ||
      content.trim().toLowerCase().startsWith("<html") ||
      contentType.includes("text/html")
    ) {
      console.error("[v0] Received HTML instead of M3U8 playlist:", content.substring(0, 200))
      return new Response("Server returned HTML instead of M3U8 playlist", { status: 502 })
    }

    // Validate M3U8 content
    if (!content.includes("#EXTM3U") && !content.includes("#EXT-X-")) {
      console.error("[v0] Invalid M3U8 content received:", content.substring(0, 200))
      return new Response("Invalid M3U8 content received", { status: 502 })
    }

    // Return with proper CORS headers
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] Error proxying m3u8:", error)
    return new Response("Internal server error", { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
