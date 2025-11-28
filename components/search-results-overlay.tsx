"use client"

import { Film, ExternalLink, Loader2 } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface SearchResult {
  title: string
  href: string
  image?: string
  type?: string
}

interface SearchResultsOverlayProps {
  isVisible: boolean
  isLoading: boolean
  results: SearchResult[]
  query: string
  onResultClick: (href: string) => void
  onViewAll: () => void
  onClose: () => void // Added onClose prop for click-away functionality
  searchRect: DOMRect | null
}

export function SearchResultsOverlay({
  isVisible,
  isLoading,
  results,
  query,
  onResultClick,
  onViewAll,
  onClose, // Added onClose prop
  searchRect,
}: SearchResultsOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isVisible) return null

  const overlayContent = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto cursor-pointer"
        onClick={onClose} // removed backdrop-blur-sm for better performance
      />

      {/* Results Container */}
      <div
        className="absolute pointer-events-auto"
        onClick={(e) => e.stopPropagation()} // Added click handler to prevent propagation when clicking anywhere in results container
        style={{
          top: searchRect ? searchRect.bottom + 8 : "50%",
          left: searchRect ? searchRect.left : "50%",
          width: searchRect ? searchRect.width : "auto",
          transform: !searchRect ? "translate(-50%, -50%)" : "none",
          maxWidth: "90vw",
          maxHeight: "50vh", // Reduced from 70vh to 50vh to prevent showing too much on bottom
        }}
      >
        <div className="glass rounded-xl border border-border/30 overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Ricerca in corso...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {" "}
                {/* Reduced from max-h-96 to max-h-80 for better height control */}
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      onResultClick(result.href)
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-accent/20 transition-all duration-200 text-left group hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden group-hover:shadow-md transition-shadow">
                      {result.image ? (
                        <img
                          src={result.image || "/placeholder.svg"}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            target.nextElementSibling?.classList.remove("hidden")
                          }}
                        />
                      ) : null}
                      <Film size={24} className={`text-muted-foreground ${result.image ? "hidden" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors overflow-hidden">
                        <span className="line-clamp-2 break-words">{result.title}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {result.type}
                        </span>
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 group-hover:scale-110"
                    />
                  </button>
                ))}
              </div>

              {query.trim() && (
                <div className="border-t border-border/30 p-3 bg-muted/20">
                  <button
                    onClick={onViewAll}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors py-3 rounded-lg hover:bg-primary/10 font-medium"
                  >
                    Vedi tutti i risultati per "{query}"
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <Film size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nessun risultato trovato per "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(overlayContent, document.body)
}
