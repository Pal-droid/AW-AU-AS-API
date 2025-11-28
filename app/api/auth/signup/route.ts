import { type NextRequest, NextResponse } from "next/server"
import { BACKEND_BASE } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const r = await fetch(`${BACKEND_BASE}/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const text = await r.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
    if (!r.ok) {
      return NextResponse.json({ ok: false, ...data }, { status: r.status })
    }
    return NextResponse.json({ ok: true, ...data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore signup" }, { status: 500 })
  }
}
