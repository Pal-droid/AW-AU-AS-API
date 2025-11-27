import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Anime Scraper API",
    version: "1.0.0",
  })
}
