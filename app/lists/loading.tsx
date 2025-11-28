import { Skeleton } from "@/components/ui/skeleton"
import { SlideOutMenu } from "@/components/slide-out-menu"

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/lists" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">Le mie liste</h1>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        {/* Auth panel skeleton */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="w-full">
          <div className="grid w-full grid-cols-4 gap-2 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>

          {/* List sections skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-4">
                      <Skeleton className="w-16 h-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
