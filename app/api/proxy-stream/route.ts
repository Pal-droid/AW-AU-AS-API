import type { NextRequest } from "next/server"
import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { CookieJar } from "@/lib/cookie-jar"
import { fetchHtmlWithSession } from "@/lib/fetch-html"

// Allow only known hosts to avoid open proxy abuse. Add new ones as needed.
const BASE_HOST = new URL(ANIMEWORLD_BASE).hostname
const ALLOWED_HOSTS = new Set<string>([
  BASE_HOST,
  "sweetpixel.org",
  "srv12-thung.sweetpixel.org",
  "srv16-suisen.sweetpixel.org",
])

function isAllowed(urlStr: string) {
  try {
    const u = new URL(urlStr)
    if (u.hostname === BASE_HOST || u.hostname.endsWith(`.${BASE_HOST}`)) return true
    if (ALLOWED_HOSTS.has(u.hostname)) return true
    if (u.hostname.endsWith(".sweetpixel.org")) return true
    return false
  } catch {
    return false
  }
}

async function fetchWithCookies(
  url: string,
  jar: CookieJar,
  headersBase: HeadersInit,
  rangeHeader?: string | null,
): Promise<Response> {
  const headers: HeadersInit = {
    ...headersBase,
  }
  const cookie = jar.getHeader(url)
  if (cookie) (headers as Record<string, string>)["Cookie"] = cookie
  if (rangeHeader) (headers as Record<string, string>)["Range"] = rangeHeader

  const res = await fetch(url, {
    method: "GET",
    headers,
    redirect: "manual",
  })

  // collect cookies for next hops (if any)
  jar.setFromResponse(url, res.headers.get("set-cookie"))
  return res
}

async function followRedirectsWithCookies(
  url: string,
  jar: CookieJar,
  baseHeaders: HeadersInit,
  rangeHeader?: string | null,
  maxRedirects = 5,
  referer?: string,
  origin?: string,
): Promise<Response> {
  let current = url
  let lastReferer = referer || "https://www.animeworld.ac/"

  for (let i = 0; i <= maxRedirects; i++) {
    const headers: HeadersInit = {
      ...baseHeaders,
      Referer: lastReferer,
      Origin: origin || "https://www.animeworld.ac",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Dest": "video",
      Accept: "*/*",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    }

    const res = await fetchWithCookies(current, jar, headers, rangeHeader)

    if (res.status === 200 || res.status === 206) {
      return res
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location")
      if (!loc) throw new Error(`Redirect (${res.status}) without Location header.`)
      const nextUrl = new URL(loc, current).toString()
      // update referer to current; some hosts require previous URL as referer
      lastReferer = current
      current = nextUrl
      continue
    }

    const snippet = await res.text().catch(() => "")
    throw new Error(`Upstream ${res.status} ${res.statusText}. ${snippet.slice(0, 160)}`)
  }
  throw new Error("Too many redirects")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const src = searchParams.get("src")
    const ref = searchParams.get("ref") // full episode page URL (final), or path
    if (!src) {
      return new Response(JSON.stringify({ ok: false, error: "Parametro 'src' mancante." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }
    if (!isAllowed(src)) {
      return new Response(JSON.stringify({ ok: false, error: "Host non consentito per il proxy." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    // Build a session: optionally visit the episode page first to get cookies/tokens
    const jar = new CookieJar()
    let refUrl: string | undefined = undefined
    if (ref) {
      refUrl = ref.startsWith("http") ? ref : `${ANIMEWORLD_BASE}${ref}`
      // Warm-up navigation -> collects animeworld cookies that may be required by token endpoints
      await fetchHtmlWithSession(refUrl, 5, jar)
    }

    const range = req.headers.get("range")

    const baseHeaders: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Anizone/1.0 Safari/537.36",
    }

    const upstream = await followRedirectsWithCookies(
      src,
      jar,
      baseHeaders,
      range,
      5,
      // Use exact episode page as Referer if provided; else base
      refUrl || "https://www.animeworld.ac/",
      refUrl ? new URL(refUrl).origin : "https://www.animeworld.ac",
    )

    // Forward streaming body and relevant headers
    const headers = new Headers()
    const ct = upstream.headers.get("content-type") || "video/mp4"
    headers.set("content-type", ct)
    const cl = upstream.headers.get("content-length")
    if (cl) headers.set("content-length", cl)
    const ar = upstream.headers.get("accept-ranges")
    headers.set("accept-ranges", ar || "bytes")
    const cd = upstream.headers.get("content-disposition")
    if (cd) headers.set("content-disposition", cd)
    const etag = upstream.headers.get("etag")
    if (etag) headers.set("etag", etag)
    const lastMod = upstream.headers.get("last-modified")
    if (lastMod) headers.set("last-modified", lastMod)
    const cr = upstream.headers.get("content-range")
    if (cr) headers.set("content-range", cr)

    // CORS + cache
    headers.set("access-control-allow-origin", "*")
    headers.set("cache-control", "private, max-age=0, must-revalidate, no-transform")

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Errore durante il proxy dello stream." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}
