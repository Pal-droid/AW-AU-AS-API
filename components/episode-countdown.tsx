"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EpisodeCountdownProps {
  nextEpisodeDate: string // Format: "2025-09-07"
  nextEpisodeTime: string // Format: "17:30:00"
  className?: string
}

export function EpisodeCountdown({ nextEpisodeDate, nextEpisodeTime, className }: EpisodeCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Combine date and time into a proper Date object
      const targetDateTime = new Date(`${nextEpisodeDate}T${nextEpisodeTime}`)
      const now = new Date()
      const difference = targetDateTime.getTime() - now.getTime()

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      } else {
        setTimeLeft(null) // Episode has already aired
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [nextEpisodeDate, nextEpisodeTime])

  if (!timeLeft) {
    return null // Don't show if episode has already aired
  }

  return (
    <Card className={`border-white/20 bg-white/5 backdrop-blur-sm ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-2 text-white">
            <Calendar size={14} />
            <span className="text-xs font-medium">Il prossimo episodio uscirà all'incirca fra</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-center">
          {timeLeft.days > 0 && (
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-white">{timeLeft.days}</div>
              <div className="text-xs text-white/70">giorni</div>
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-white">{timeLeft.hours.toString().padStart(2, "0")}</div>
            <div className="text-xs text-white/70">ore</div>
          </div>

          <div className="text-white text-sm">:</div>

          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-white">{timeLeft.minutes.toString().padStart(2, "0")}</div>
            <div className="text-xs text-white/70">min</div>
          </div>

          <div className="text-white text-sm">:</div>

          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-white">{timeLeft.seconds.toString().padStart(2, "0")}</div>
            <div className="text-xs text-white/70">sec</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/70">
          <Clock size={12} />
          <span>Aggiornamento in tempo reale</span>
        </div>
      </CardContent>
    </Card>
  )
}
