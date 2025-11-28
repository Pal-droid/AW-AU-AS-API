export type Season = "winter" | "spring" | "summer" | "autumn"

export interface SeasonalTheme {
  season: Season
  colors: {
    primary: string
    accent: string
    background: string
  }
  particles: {
    emoji: string
    count: number
  }
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12

  if (month >= 9 && month <= 11) return "autumn" // Sep-Nov
  if (month === 12 || month <= 2) return "winter" // Dec-Feb
  if (month >= 3 && month <= 5) return "spring" // Mar-May
  return "summer" // Jun-Aug
}

export function getSeasonalTheme(season: Season): SeasonalTheme {
  const themes: Record<Season, SeasonalTheme> = {
    autumn: {
      season: "autumn",
      colors: {
        primary: "oklch(0.55 0.15 40)", // Warm orange
        accent: "oklch(0.45 0.12 30)", // Deep autumn red
        background: "oklch(0.08 0.02 40 / 0.05)", // Subtle warm tint
      },
      particles: {
        emoji: "🍂",
        count: 15,
      },
    },
    winter: {
      season: "winter",
      colors: {
        primary: "oklch(0.7 0.1 240)", // Cool blue
        accent: "oklch(0.85 0.05 200)", // Icy cyan
        background: "oklch(0.08 0.02 240 / 0.05)", // Subtle cool tint
      },
      particles: {
        emoji: "❄️",
        count: 20,
      },
    },
    spring: {
      season: "spring",
      colors: {
        primary: "oklch(0.65 0.15 140)", // Fresh green
        accent: "oklch(0.75 0.12 330)", // Soft pink
        background: "oklch(0.08 0.02 140 / 0.05)", // Subtle fresh tint
      },
      particles: {
        emoji: "🌸",
        count: 12,
      },
    },
    summer: {
      season: "summer",
      colors: {
        primary: "oklch(0.7 0.2 60)", // Bright yellow
        accent: "oklch(0.6 0.18 180)", // Tropical cyan
        background: "oklch(0.08 0.02 60 / 0.05)", // Subtle warm tint
      },
      particles: {
        emoji: "☀️",
        count: 8,
      },
    },
  }

  return themes[season]
}
