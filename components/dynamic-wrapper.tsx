"use client"

import type React from "react"

import { Suspense, lazy, type ComponentType } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface DynamicWrapperProps {
  fallback?: React.ReactNode
  className?: string
}

export function createDynamicComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
) {
  const LazyComponent = lazy(importFn)

  return function DynamicComponent(props: React.ComponentProps<T> & DynamicWrapperProps) {
    const { fallback: customFallback, className, ...componentProps } = props

    const defaultFallback = (
      <div className={className}>
        <Skeleton className="w-full h-32" />
      </div>
    )

    return (
      <Suspense fallback={customFallback || defaultFallback}>
        <LazyComponent {...componentProps} />
      </Suspense>
    )
  }
}

export const DynamicEpisodePlayer = createDynamicComponent(
  () => import("@/components/episode-player").then((mod) => ({ default: mod.EpisodePlayer })),
  <div className="w-full aspect-video bg-black rounded-md flex items-center justify-center">
    <div className="text-white">Caricamento player...</div>
  </div>,
)

export const DynamicSearchResultsOverlay = createDynamicComponent(
  () => import("@/components/search-results-overlay").then((mod) => ({ default: mod.SearchResultsOverlay })),
  null,
)
