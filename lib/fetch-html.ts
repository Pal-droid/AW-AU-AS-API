import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { CookieJar } from "@/lib/cookie-jar"

const COMMON_HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const

function toAbsolute(url: string, location: string) {
  try {
    return new URL(location, url).toString()
  } catch {
    if (location.startsWith("http")) return location
    if (!location.startsWith("/")) location = "/" + location
    return `${ANIMEWORLD_BASE}${location}`
  }
}

export async function fetchHtmlWithSession(
  url: string,
  maxRedirects = 5,
  jar: CookieJar = new CookieJar(),
): Promise<{ html: string; finalUrl: string; jar: CookieJar }> {
  let currentUrl = url
  let referer: string | undefined = undefined

  for (let i = 0; i <= maxRedirects; i++) {
    const headers: HeadersInit = {
      ...COMMON_HEADERS_BASE,
      Referer: referer || "https://www.animeworld.ac/",
      Origin: "https://www.animeworld.ac",
      "Sec-Fetch-Site": referer ? "same-site" : "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
    }
    const cookie = jar.getHeader(currentUrl)
    if (cookie) (headers as Record<string, string>)["Cookie"] = cookie

    const res = await fetch(currentUrl, {
      method: "GET",
      headers,
      redirect: "manual",
      cache: "no-store",
    })

    jar.setFromResponse(currentUrl, res.headers.get("set-cookie"))

    if (res.status >= 200 && res.status < 300) {
      const html = await res.text()
      return { html, finalUrl: currentUrl, jar }
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location")
      if (!loc) {
        const text = await res.text().catch(() => "")
        throw new Error(`Redirect (${res.status}) senza Location. Snippet: ${text.slice(0, 200)}`)
      }
      referer = currentUrl
      currentUrl = toAbsolute(currentUrl, loc)
      continue
    }

    const snippet = await res.text().catch(() => "")
    throw new Error(`Upstream ${res.status} ${res.statusText}. Snippet: ${snippet.slice(0, 200)}`)
  }

  throw new Error(`Troppe redirezioni per ${url}`)
}

// Back-compat wrapper for callers that only need HTML
export async function fetchHtml(url: string, maxRedirects = 5): Promise<{ html: string; finalUrl: string }> {
  const { html, finalUrl } = await fetchHtmlWithSession(url, maxRedirects)
  return { html, finalUrl }
}
