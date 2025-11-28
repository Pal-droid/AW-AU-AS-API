"use client"

import Link from "next/link"
import { Search, List, BookOpen, Calendar, Sparkles, Bug } from "lucide-react"
import HeroSearch from "@/components/hero-search"
import { TopAnime } from "@/components/top-anime"
import { DiscoverSections } from "@/components/discover"
import { AnimeContentSections } from "@/components/anime-content-sections"
import { AnimatedLogo } from "@/components/animated-logo"
import { NewAdditions } from "@/components/new-additions"
import { OngoingAnime } from "@/components/ongoing-anime"
import UpcomingFall2025 from "@/components/upcoming-fall-2025"
import { LazySection } from "@/components/lazy-section"
import { useIsDesktop } from "@/hooks/use-desktop"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const isDesktop = useIsDesktop()
  const [showBugReport, setShowBugReport] = useState(false)

  if (isDesktop) {
    return (
      <main className="min-h-screen pb-20">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
            <div className="animate-float">
              <AnimatedLogo />
            </div>

            <nav className="flex items-center gap-2">
              {[
                { href: "/lists", icon: List, label: "Le mie liste" },
                { href: "/search", icon: Search, label: "Cerca" },
                { href: "/manga", icon: BookOpen, label: "Manga" },
                { href: "/schedule", icon: Calendar, label: "Calendario" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full",
                    "text-sm font-medium text-muted-foreground",
                    "hover:text-foreground hover:bg-muted/50",
                    "transition-all duration-200 group",
                  )}
                >
                  <item.icon size={18} className="group-hover:scale-110 transition-transform" />
                  <span>{item.label}</span>
                </Link>
              ))}

              <button
                onClick={() => setShowBugReport(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full",
                  "text-sm font-medium text-muted-foreground",
                  "hover:text-foreground hover:bg-muted/50",
                  "transition-all duration-200 group",
                )}
              >
                <Bug size={18} className="group-hover:scale-110 transition-transform" />
                <span>Segnala Bug</span>
              </button>
            </nav>
          </div>
        </header>

        {/* ---------- HERO SECTION (FIXED + CENTERED) ---------- */}
        <section className="px-8 py-8 max-w-[1400px] mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-card p-10 mb-10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />

            {/* Main hero content width */}
            <div className="relative z-10 w-full max-w-[900px] mx-auto text-center">

              {/* Title + icon */}
              <div className="flex items-center gap-3 mb-5 justify-center">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="text-primary" size={22} />
                </div>

                <h1 className="text-4xl font-bold text-foreground">
                  Guarda anime in italiano
                </h1>
              </div>

              {/* Search bar (now same width as title) */}
              <div className="relative w-full max-w-[900px] mx-auto">
                <HeroSearch />
              </div>
            </div>
          </div>

          {/* ---------- MAIN CONTENT ---------- */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-6">
              <LazySection className="surface-elevated p-6">
                <AnimeContentSections />
              </LazySection>

              <LazySection className="surface-elevated p-6">
                <TopAnime />
              </LazySection>
            </div>

            <div className="col-span-4 space-y-6">
              <LazySection className="surface-elevated p-5">
                <NewAdditions />
              </LazySection>

              <LazySection className="surface-elevated p-5">
                <OngoingAnime />
              </LazySection>

              <LazySection>
                <UpcomingFall2025 />
              </LazySection>

              <LazySection className="surface-elevated p-5">
                <DiscoverSections />
              </LazySection>
            </div>
          </div>
        </section>

        <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
      </main>
    )
  }

  // ---------- MOBILE VERSION ----------
  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu currentPath="/" />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 py-4 flex items-center justify-center">
          <div className="animate-float">
            <AnimatedLogo />
          </div>
        </div>
      </header>

      <section className="px-4 py-6 space-y-5">
        <div className="relative overflow-hidden rounded-3xl bg-card p-6 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="text-primary" size={18} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Guarda anime in italiano
              </h1>
            </div>

            <HeroSearch />
          </div>
        </div>

        <LazySection className="surface-elevated p-5">
          <AnimeContentSections />
        </LazySection>

        <LazySection className="surface-elevated p-5">
          <NewAdditions />
        </LazySection>

        <LazySection className="surface-elevated p-5">
          <OngoingAnime />
        </LazySection>

        <LazySection>
          <UpcomingFall2025 />
        </LazySection>

        <LazySection className="surface-elevated p-5">
          <DiscoverSections />
        </LazySection>

        <LazySection className="surface-elevated p-5">
          <TopAnime />
        </LazySection>
      </section>
    </main>
  )
}
