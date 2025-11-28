import { type NextRequest, NextResponse } from "next/server"
import { BACKEND_BASE, JWT_COOKIE } from "@/lib/backend"

const USER_COOKIE = "azid"

function getOrCreateUserId(req: NextRequest) {
  const existing = req.cookies.get(USER_COOKIE)?.value
  return existing ?? crypto.randomUUID()
}

function attachUserCookieIfNeeded(req: NextRequest, res: NextResponse, userId: string) {
  const existing = req.cookies.get(USER_COOKIE)?.value
  if (!existing) {
    res.cookies.set(USER_COOKIE, userId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
}

export async function GET(req: NextRequest) {
  const userId = getOrCreateUserId(req)
  const token = req.cookies.get(JWT_COOKIE)?.value

  if (!token) {
    const res = NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }

  try {
    const r = await fetch(`${BACKEND_BASE}/user/data`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    if (r.status === 401) {
      const res = NextResponse.json({ ok: false, error: "Sessione scaduta" }, { status: 401 })
      res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }

    const data = await r.json()
    const res = NextResponse.json({ ok: true, data })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  } catch (error) {
    console.error("[v0] Backend error:", error)
    const res = NextResponse.json({ ok: false, error: "Errore backend" }, { status: 500 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }
}

export async function POST(req: NextRequest) {
  const userId = getOrCreateUserId(req)
  const token = req.cookies.get(JWT_COOKIE)?.value

  if (!token) {
    const res = NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }

  try {
    const body = await req.json()

    const r = await fetch(`${BACKEND_BASE}/user/data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (r.status === 401) {
      const res = NextResponse.json({ ok: false, error: "Sessione scaduta" }, { status: 401 })
      res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }

    if (!r.ok) {
      const errorText = await r.text().catch(() => "")
      throw new Error(`Save failed: ${errorText.slice(0, 200)}`)
    }

    const res = NextResponse.json({ ok: true })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  } catch (error) {
    console.error("[v0] Save error:", error)
    const res = NextResponse.json({ ok: false, error: "Errore salvataggio" }, { status: 500 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }
}
