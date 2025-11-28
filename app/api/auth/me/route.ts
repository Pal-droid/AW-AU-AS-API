import { type NextRequest, NextResponse } from "next/server"
import { BACKEND_BASE, JWT_COOKIE } from "@/lib/backend"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value
  if (!token) return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 })
  const r = await fetch(`${BACKEND_BASE}/protected`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (r.status === 401) {
    const res = NextResponse.json({ ok: false, error: "Token scaduto" }, { status: 401 })
    res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
    return res
  }
  const j = await r.json().catch(async () => ({ message: await r.text() }))
  const message: string = j?.message || ""
  const nameMatch = message.match(/Hello,\s*([^!]+)!/)
  const username = nameMatch ? nameMatch[1] : null
  return NextResponse.json({ ok: true, username })
}
