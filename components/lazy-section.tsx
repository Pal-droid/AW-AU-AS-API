"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"

interface LazySectionProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  threshold?: number
  className?: string
}

export function LazySection({
  children,
  fallback = null,
  rootMargin = "100px",
  threshold = 0.1,
  className = "",
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
          // Disconnect observer after first load to prevent re-loading
          observer.disconnect()
        }
      },
      {
        rootMargin,
        threshold,
      },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold, hasLoaded])

  return (
    <div ref={ref} className={className}>
      {isVisible
        ? children
        : fallback || (
            <div className="glass rounded-xl p-6 transition-smooth hover:glow">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted/50 rounded w-1/3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-full"></div>
                  <div className="h-4 bg-muted/30 rounded w-3/4"></div>
                  <div className="h-4 bg-muted/30 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
