import { splitCookiesString, parse as parseSetCookie } from "set-cookie-parser"

export type Cookie = {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: Date | string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: "strict" | "lax" | "none"
}

export class CookieJar {
  private store: Cookie[] = []

  setFromResponse(originUrl: string, setCookieHeader: string | null) {
    if (!setCookieHeader) return
    const parts = splitCookiesString(setCookieHeader)
    const parsed = parseSetCookie(parts, { map: false })
    for (const c of parsed) {
      const originHost = new URL(originUrl).hostname
      const cookie: Cookie = {
        name: c.name,
        value: c.value,
        domain: c.domain || originHost,
        path: c.path || "/",
        expires: c.expires,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: (c.sameSite?.toLowerCase() as Cookie["sameSite"]) || undefined,
      }
      const idx = this.store.findIndex(
        (x) => x.name === cookie.name && x.domain === cookie.domain && x.path === cookie.path,
      )
      if (idx >= 0) this.store[idx] = cookie
      else this.store.push(cookie)
    }
  }

  getHeader(url: string) {
    const { hostname, pathname, protocol } = new URL(url)
    const isHttps = protocol === "https:"
    const pairs: string[] = []
    for (const c of this.store) {
      const domainOk = c.domain
        ? hostname === c.domain ||
          (c.domain.startsWith(".") ? hostname.endsWith(c.domain) : hostname.endsWith(c.domain))
        : true
      const pathOk = pathname.startsWith(c.path || "/")
      const secureOk = c.secure ? isHttps : true
      if (domainOk && pathOk && secureOk) {
        pairs.push(`${c.name}=${c.value}`)
      }
    }
    return pairs.length ? pairs.join("; ") : ""
  }
}
