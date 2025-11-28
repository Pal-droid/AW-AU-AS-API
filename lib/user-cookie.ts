import type { NextRequest, NextResponse } from "next/server"

export const USER_COOKIE = "azid"

export function getUserIdFromRequest(req: NextRequest): string | null {
  const v = req.cookies.get(USER_COOKIE)?.value
  return v ?? null
}

export function ensureUserCookie(req: NextRequest, res: NextResponse): string {
  let id = getUserIdFromRequest(req)
  if (!id) {
    id = crypto.randomUUID()
    res.cookies.set(USER_COOKIE, id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return id
}
