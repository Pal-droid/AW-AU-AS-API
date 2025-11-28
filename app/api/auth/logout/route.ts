import { type NextRequest, NextResponse } from "next/server"
import { JWT_COOKIE } from "@/lib/backend"

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
