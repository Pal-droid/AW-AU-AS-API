"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Film, BookOpen, Search, List, Calendar, Bug, ChevronRight } from "lucide-react"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { cn } from "@/lib/utils"

interface SlideOutMenuProps {
  currentPath?: string
}

export function SlideOutMenu({ currentPath = "/" }: SlideOutMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const menuItems = [
    { href: "/", icon: Film, label: "Anime", description: "Guarda serie e film", key: "anime" },
    { href: "/manga", icon: BookOpen, label: "Manga", description: "Leggi capitoli ITA", key: "manga" },
    { href: "/search", icon: Search, label: "Cerca", description: "Trova anime e manga", key: "search" },
    { href: "/lists", icon: List, label: "Le mie liste", description: "Preferiti e cronologia", key: "lists" },
    { href: "/schedule", icon: Calendar, label: "Calendario", description: "Prossime uscite", key: "schedule" },
  ]

  const isActive = (href: string) => {
    if (href === "/" && currentPath === "/") return true
    if (href !== "/" && currentPath.startsWith(href)) return true
    return false
  }

  const handleBugReport = () => {
    setShowBugReport(true)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center",
          "bg-transparent text-foreground rounded-2xl",
          "transition-all duration-200",
          "active:scale-95 hover:text-primary",
        )}
        aria-label="Apri menu"
      >
        <Menu size={22} strokeWidth={2.5} />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          isOpen
            ? "bg-background/60 backdrop-blur-sm pointer-events-auto"
            : "bg-transparent backdrop-blur-none pointer-events-none",
        )}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 z-50",
          "bg-card border-r border-border",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-lg font-bold">A</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Anizone</h2>
                <p className="text-xs text-muted-foreground">Streaming italiano</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Chiudi menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200",
                    "group relative overflow-hidden ripple",
                    active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground group-hover:bg-muted",
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-sm">{item.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5 truncate">{item.description}</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={cn("text-muted-foreground transition-transform", "group-hover:translate-x-0.5")}
                  />
                </Link>
              )
            })}
          </div>

          <div className="my-4 mx-4 h-px bg-border" />

          <button
            onClick={handleBugReport}
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 w-full",
              "text-foreground hover:bg-muted/50 group ripple",
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <Bug size={20} />
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-sm">Segnala un bug</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Aiutaci a migliorare</span>
            </div>
          </button>
        </nav>

        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">Anizone v1.0</p>
        </div>
      </div>

      <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
    </>
  )
}
