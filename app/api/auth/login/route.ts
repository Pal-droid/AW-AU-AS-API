import { type NextRequest, NextResponse } from "next/server"
import { BACKEND_BASE, JWT_COOKIE } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const r = await fetch(`${BACKEND_BASE}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const j = await r.json().catch(async () => ({ message: await r.text() }))
    if (!r.ok) {
      return NextResponse.json({ ok: false, ...j }, { status: r.status })
    }
    const token = j?.access_token as string | undefined
    if (!token) {
      return NextResponse.json({ ok: false, error: "Token mancante nella risposta" }, { status: 500 })
    }
    const res = NextResponse.json({ ok: true })
    // JWT expires in ~15m, set slightly less to avoid edge
    res.cookies.set(JWT_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 14, // 14 minutes
      secure: true,
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore login" }, { status: 500 })
  }
}
