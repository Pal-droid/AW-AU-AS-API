import { type NextRequest, NextResponse } from "next/server"
import { fetchScheduleForDate } from "@/lib/animeworld"

type ScheduleItem = {
  id: string
  time: string
  title: string
  episode: string
  href: string
  image?: string
}

type DaySchedule = {
  date: string
  dayName: string
  items: ScheduleItem[]
}

export async function GET(request: NextRequest) {
  try {
    let schedule: DaySchedule[] = []
    let dateRange = ""

    try {
      schedule = await fetchScheduleForDate()

      if (schedule.length > 0) {
        const firstDate = schedule[0].date
        const lastDate = schedule[schedule.length - 1].date

        if (firstDate && lastDate) {
          const formatItalianDate = (dateStr: string) => {
            const date = new Date(dateStr)
            const months = [
              "gennaio",
              "febbraio",
              "marzo",
              "aprile",
              "maggio",
              "giugno",
              "luglio",
              "agosto",
              "settembre",
              "ottobre",
              "novembre",
              "dicembre",
            ]
            return `${date.getDate()} ${months[date.getMonth()]}`
          }

          dateRange = `${formatItalianDate(firstDate)} - ${formatItalianDate(lastDate)}`
        }
      }

      if (!dateRange) {
        // Fallback to current week
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

        const formatDate = (date: Date) => {
          const months = [
            "gennaio",
            "febbraio",
            "marzo",
            "aprile",
            "maggio",
            "giugno",
            "luglio",
            "agosto",
            "settembre",
            "ottobre",
            "novembre",
            "dicembre",
          ]
          return `${date.getDate()} ${months[date.getMonth()]}`
        }

        dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
      }
    } catch (error) {
      console.error("Failed to fetch real schedule data:", error)
      // Keep empty schedule and default date range
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const formatDate = (date: Date) => {
        const months = [
          "gennaio",
          "febbraio",
          "marzo",
          "aprile",
          "maggio",
          "giugno",
          "luglio",
          "agosto",
          "settembre",
          "ottobre",
          "novembre",
          "dicembre",
        ]
        return `${date.getDate()} ${months[date.getMonth()]}`
      }

      dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
    }

    return NextResponse.json({
      ok: true,
      schedule,
      dateRange,
    })
  } catch (error) {
    console.error("Schedule API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch schedule" }, { status: 500 })
  }
}
