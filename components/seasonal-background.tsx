"use client"

import { useEffect, useState } from "react"
import { getCurrentSeason, getSeasonalTheme } from "@/lib/seasonal-theme"

interface Particle {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
}

export function SeasonalBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [hasPlayed, setHasPlayed] = useState(false)
  const season = getCurrentSeason()
  const theme = getSeasonalTheme(season)

  useEffect(() => {
    if (hasPlayed) return

    // Generate particles
    const newParticles: Particle[] = Array.from({ length: theme.particles.count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 20, // 10-30s
      animationDelay: Math.random() * 5, // 0-5s delay
      size: 0.8 + Math.random() * 0.4, // 0.8-1.2 scale
    }))
    setParticles(newParticles)
    setHasPlayed(true)
  }, [theme.particles.count, hasPlayed])

  return (
    <>
      {/* Seasonal color overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at top, ${theme.colors.background} 0%, transparent 50%)`,
        }}
      />

      {/* Animated particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-fall opacity-60"
            style={{
              left: `${particle.left}%`,
              top: "-5%",
              fontSize: `${particle.size * 1.5}rem`,
              animationDuration: `${particle.animationDuration}s`,
              animationDelay: `${particle.animationDelay}s`,
              filter: "drop-shadow(0 0 2px rgba(0,0,0,0.3))",
            }}
          >
            {theme.particles.emoji}
          </div>
        ))}
      </div>
    </>
  )
}
