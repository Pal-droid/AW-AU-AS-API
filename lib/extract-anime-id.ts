export function extractAnimeIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    if (pathParts.length >= 2 && pathParts[0] === "play") {
      return pathParts[1]
    }
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    console.warn("[v0] Could not extract anime ID from URL:", url)
    return url
  } catch (error) {
    console.warn("[v0] Error parsing URL:", url, error)
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    return url
  }
}
