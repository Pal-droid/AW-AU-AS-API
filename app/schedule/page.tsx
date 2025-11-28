import Link from "next/link"
import { ScheduleCalendar } from "@/components/schedule-calendar"
import { SlideOutMenu } from "@/components/slide-out-menu"

export default function SchedulePage() {
  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/schedule" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <div className="rounded-lg bg-neutral-950 text-white p-5">
          <h1 className="text-xl font-bold">Calendario Anime</h1>
          <p className="text-xs text-neutral-300 mt-1">
            Scopri quando escono i nuovi episodi dei tuoi anime preferiti.
          </p>
        </div>

        <ScheduleCalendar />
      </section>
    </main>
  )
}
