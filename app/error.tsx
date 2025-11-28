"use client"

import Link from "next/link"
import { Home, Search, ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react"
import { AnimatedLogo } from "@/components/animated-logo"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="animate-float mb-8">
          <AnimatedLogo />
        </div>

        <div className="relative overflow-hidden rounded-3xl glass p-12 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-4 mb-6">
              <AlertTriangle className="text-red-400 animate-pulse" size={32} />
              <h1 className="text-8xl font-bold text-white font-[var(--font-playfair)] glow">500</h1>
              <AlertTriangle className="text-red-400 animate-pulse" size={32} />
            </div>

            <h2 className="text-3xl font-bold text-white mb-4 font-[var(--font-playfair)]">Errore del Server</h2>

            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Ops! Qualcosa è andato storto nei nostri server. I nostri tecnici stanno già lavorando per risolvere il
              problema.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={reset} className="glass-strong hover:glow transition-smooth group">
                <RefreshCw size={18} className="group-hover:scale-110 transition-transform mr-2" />
                Riprova
              </Button>

              <Button asChild variant="outline" className="glass hover:glow transition-smooth group bg-transparent">
                <Link href="/" className="flex items-center gap-2">
                  <Home size={18} className="group-hover:scale-110 transition-transform" />
                  Torna alla Home
                </Link>
              </Button>

              <Button asChild variant="outline" className="glass hover:glow transition-smooth group bg-transparent">
                <Link href="/search" className="flex items-center gap-2">
                  <Search size={18} className="group-hover:scale-110 transition-transform" />
                  Cerca Anime
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-smooth hover:glow group mx-auto"
        >
          <ArrowLeft size={16} className="group-hover:scale-110 transition-transform" />
          <span>Torna indietro</span>
        </button>
      </div>
    </main>
  )
}
