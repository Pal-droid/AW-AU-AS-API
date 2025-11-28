import { type NextRequest, NextResponse } from "next/server"
import { getSeasonalTheme, type Season } from "@/lib/seasonal-theme"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const season = searchParams.get("season") as Season | null

  if (!season || !["spring", "summer", "autumn", "winter"].includes(season)) {
    return NextResponse.json(
      {
        error: "Invalid season. Use: spring, summer, autumn, or winter",
        example: "/api/test-theme?season=autumn",
      },
      { status: 400 },
    )
  }

  const theme = getSeasonalTheme(season)

  return NextResponse.json({
    season,
    theme,
    description: `Testing ${season} theme`,
  })
}
