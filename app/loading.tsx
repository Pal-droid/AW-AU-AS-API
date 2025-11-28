import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass-strong border-b border-border/30">
        <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </div>
      </header>

      <section className="px-8 py-12 max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-3xl glass p-12 mb-12">
          <div className="max-w-4xl space-y-6">
            <Skeleton className="h-12 w-96" />
            <Skeleton className="h-6 w-full max-w-2xl" />
            <Skeleton className="h-12 w-full max-w-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-8">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="aspect-[3/4] w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-4 space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex gap-3">
                      <Skeleton className="w-12 h-16" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
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
