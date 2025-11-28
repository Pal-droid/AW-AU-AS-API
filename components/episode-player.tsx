"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EpisodeCountdown } from "@/components/episode-countdown"

declare global {
  interface Window {
    Hls?: any
  }
}

type Episode = { num: number; href: string; id?: string; unifiedData?: any }
type Source = { name: string; url: string; id: string }

function epKey(e: Episode) {
  return `${e.num}-${e.href}`
}

function seriesBaseFromPath(path: string) {
  try {
    const u = new URL(path, "https://dummy.local")
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) return `/${parts[0]}/${parts[1]}`
    return u.pathname
  } catch {
    const parts = path.split("/").filter(Boolean)
    if (parts.length >= 2) return `/${parts[0]}/${parts[1]}`
    return path
  }
}

function extractAnimeIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    if (pathParts.length >= 2 && pathParts[0] === "play") {
      return pathParts[1]
    }
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    console.warn("[v0] Could not extract anime ID from URL:", url)
    return url
  } catch (error) {
    console.warn("[v0] Error parsing URL:", url, error)
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    return url
  }
}

function extractAnimeIdFromSourceId(sourceId: string): string {
  // If it contains a slash, it might be an episode ID - extract the anime part
  if (sourceId.includes("/")) {
    return sourceId.split("/")[0]
  }
  return sourceId
}

function storageGet<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function storageSet(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

export function EpisodePlayer({
  path,
  seriesTitle = "Anime",
  sources = [],
  nextEpisodeDate,
  nextEpisodeTime,
}: {
  path: string
  seriesTitle?: string
  sources?: Source[]
  nextEpisodeDate?: string
  nextEpisodeTime?: string
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<string>("AnimeWorld")
  const [selectedResolution, setSelectedResolution] = useState<string>("1080")
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [episodeRefUrl, setEpisodeRefUrl] = useState<string | null>(null)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoNext, setAutoNext] = useState<boolean>(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const hlsRef = useRef<any>(null)
  const currentPathRef = useRef<string>("")
  const lastSentAtRef = useRef<number>(0)
  const lastSentSecRef = useRef<number>(0)
  const restoreDoneRef = useRef<boolean>(false)

  const seriesKeyForStore = useMemo(() => seriesBaseFromPath(path), [path])

  const availableServers = useMemo(() => {
    const serverNames = sources?.map((s) => s.name) || []
    return serverNames.filter((name) => name === "AnimeWorld" || name === "AnimeSaturn")
  }, [sources])

  const serverDisplayNames = useMemo(
    () => ({
      AnimeWorld: "World",
      AnimeSaturn: "Saturn",
      AnimePahe: "Pahe (non disponibile)",
    }),
    [],
  )

  const isEmbedServer = selectedServer === "AnimeSaturn"
  const isAnimePahe = selectedServer === "AnimePahe"

  const availableResolutions = ["1080", "720", "480", "360"]

  useEffect(() => {
    if (currentPathRef.current && currentPathRef.current !== path) {
      console.log("[v0] Anime path changed from", currentPathRef.current, "to", path, "- clearing cached data")

      try {
        const oldAnimeId = extractAnimeIdFromUrl(currentPathRef.current)
        const newAnimeId = extractAnimeIdFromUrl(path)

        if (oldAnimeId !== newAnimeId) {
          sessionStorage.removeItem(`anizone:sources:${currentPathRef.current}`)

          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes(oldAnimeId) || key.includes(currentPathRef.current))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key))

          setEpisodes([])
          setSelectedKey(null)
          setStreamUrl(null)
          setEmbedUrl(null)
          setEpisodeRefUrl(null)
          setProxyUrl(null)
          setError(null)
          setLoadingEpisodes(true)
        }
      } catch (e) {
        console.log("[v0] Error clearing cached data:", e)
      }
    }
    currentPathRef.current = path
  }, [path])

  useEffect(() => {
    try {
      const v = localStorage.getItem("anizone:autoNext")
      if (v === "0") setAutoNext(false)
      else setAutoNext(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("anizone:autoNext", autoNext ? "1" : "0")
    } catch {}
  }, [autoNext])

  useEffect(() => {
    if (availableServers.length > 0 && !availableServers.includes(selectedServer)) {
      setSelectedServer(availableServers[0])
    }
  }, [availableServers, selectedServer])

  useEffect(() => {
    const abort = new AbortController()
    ;(async () => {
      setLoadingEpisodes(true)
      setError(null)
      try {
        console.log("[v0] Loading episodes for server:", selectedServer, "with sources:", sources)

        // Find the source for the selected server
        const currentSource = sources?.find((s) => s.name === selectedServer)

        if (!currentSource?.id) {
          // Try to find any available source
          const anySource = sources?.find((s) => s.id)
          if (!anySource) {
            throw new Error("No source IDs available")
          }
        }

        // Build params based on available sources
        const params = new URLSearchParams()
        const awSource = sources?.find((s) => s.name === "AnimeWorld")
        const asSource = sources?.find((s) => s.name === "AnimeSaturn")

        if (awSource?.id) params.set("AW", awSource.id)
        if (asSource?.id) params.set("AS", asSource.id)

        console.log("[v0] Fetching episodes with params:", params.toString())

        const apiUrl = `https://aw-au-as-api.vercel.app/api/episodes?${params}`
        const r = await fetch(apiUrl, {
          signal: abort.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })

        if (!r.ok) {
          const errorText = await r.text()
          throw new Error(`Episodes API failed: ${errorText}`)
        }

        const data = await r.json()
        console.log("[v0] Episodes API response:", data)

        if (Array.isArray(data) && data.length > 0) {
          const mapped: Episode[] = data.map((ep: any) => ({
            num: ep.episode_number,
            href: ep.sources?.AnimeWorld?.url || ep.sources?.AnimeSaturn?.url || "",
            id: ep.sources?.AnimeWorld?.id || ep.sources?.AnimeSaturn?.id || "",
            unifiedData: ep,
          }))
          setEpisodes(mapped)
        } else {
          throw new Error("No episodes found")
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
        console.error("[v0] Episodes loading error:", e)
        setError(e?.message || "Errore nel caricamento episodi")
      } finally {
        if (!abort.signal.aborted) setLoadingEpisodes(false)
      }
    })()
    return () => abort.abort()
  }, [path, sources])

  const selectedEpisode = useMemo(
    () => (selectedKey ? (episodes.find((e) => epKey(e) === selectedKey) ?? null) : null),
    [selectedKey, episodes],
  )

  useEffect(() => {
    if (!selectedEpisode) return
    const abort = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      setStreamUrl(null)
      setEmbedUrl(null)
      setProxyUrl(null)

      const cacheKey = `anizone:stream:${epKey(selectedEpisode)}:${selectedServer}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.streamUrl) setStreamUrl(parsed.streamUrl)
          if (parsed.embedUrl) setEmbedUrl(parsed.embedUrl)
          if (parsed.proxyUrl) setProxyUrl(parsed.proxyUrl)
          if (parsed.streamUrl || parsed.embedUrl || parsed.proxyUrl) {
            setLoading(false)
            return
          }
        } catch {}
      }

      try {
        console.log("[v0] Loading stream for episode:", selectedEpisode, "server:", selectedServer)

        const unifiedEp = selectedEpisode.unifiedData
        if (!unifiedEp) {
          throw new Error("No unified data available for this episode")
        }

        const params = new URLSearchParams()

        if (selectedServer === "AnimeWorld" && unifiedEp.sources.AnimeWorld?.id) {
          params.set("AW", unifiedEp.sources.AnimeWorld.id)
          console.log("[v0] Using AnimeWorld episode ID for stream:", unifiedEp.sources.AnimeWorld.id)
        } else if (selectedServer === "AnimeSaturn" && unifiedEp.sources.AnimeSaturn?.id) {
          params.set("AS", unifiedEp.sources.AnimeSaturn.id)
          console.log("[v0] Using AnimeSaturn episode ID for stream:", unifiedEp.sources.AnimeSaturn.id)
        }

        if (!params.toString()) {
          throw new Error(`No valid ${selectedServer} source ID found for this episode`)
        }

        const apiUrl = `https://aw-au-as-api.vercel.app/api/stream?${params}`
        console.log("[v0] Calling unified stream API:", apiUrl)

        const r = await fetch(apiUrl, {
          signal: abort.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          },
        })

        console.log("[v0] Unified stream API response status:", r.status)

        if (!r.ok) {
          const errorText = await r.text()
          throw new Error(`Stream API failed with status ${r.status}: ${errorText}`)
        }

        const streamData = await r.json()
        console.log("[v0] Stream data:", streamData)

        const serverData = streamData[selectedServer]

        if (!serverData || !serverData.available) {
          throw new Error(`${selectedServer} is not available for this episode`)
        }

        if (selectedServer === "AnimeSaturn" && serverData.stream_url) {
          const rawStreamUrl = serverData.stream_url
          // Build embed URL using the AnimeSaturn proxy
          const embed = `https://animesaturn-proxy.onrender.com/embed?url=${encodeURIComponent(rawStreamUrl)}`
          console.log("[v0] Got AnimeSaturn embed URL:", embed)
          setStreamUrl(rawStreamUrl)
          setEmbedUrl(embed)
          setEpisodeRefUrl(selectedEpisode.href)

          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: rawStreamUrl, embedUrl: embed }))
        } else if (selectedServer === "AnimeWorld" && serverData.stream_url) {
          const direct = serverData.stream_url
          console.log("[v0] Got AnimeWorld stream URL:", direct)
          setStreamUrl(direct)
          setEpisodeRefUrl(selectedEpisode.href)

          // Create proxy URL for playback
          const stamp = Math.floor(Date.now() / 60000)
          const proxy = `/api/proxy-stream?src=${encodeURIComponent(direct)}&ref=${encodeURIComponent(selectedEpisode.href)}&ts=${stamp}`
          setProxyUrl(proxy)

          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: direct, proxyUrl: proxy }))
        } else {
          throw new Error(`Invalid stream data format for ${selectedServer}`)
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
        console.log("[v0] Stream loading error:", e)
        setError(e?.message || "Errore nel caricamento dello stream")
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    })()
    return () => abort.abort()
  }, [selectedEpisode, selectedServer, selectedResolution, path])

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [proxyUrl, selectedServer])

  useEffect(() => {
    if (isEmbedServer) return
    const v = videoRef.current
    if (!v) return
    const onTime = () => sendProgress(v.currentTime)
    const onPause = () => sendProgress(v.currentTime, { immediate: true })
    const onEnded = () => sendProgress(v.duration || v.currentTime || 0, { immediate: true })
    const onVis = () => {
      if (document.visibilityState === "hidden") sendProgress(v.currentTime, { keepalive: true, immediate: true })
    }
    const onUnload = () => sendProgress(v.currentTime, { keepalive: true, immediate: true })
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("pause", onPause)
    v.addEventListener("ended", onEnded)
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pagehide", onUnload)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("pause", onPause)
      v.removeEventListener("ended", onEnded)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pagehide", onUnload)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [selectedEpisode, seriesKeyForStore, seriesTitle, isEmbedServer])

  useEffect(() => {
    if (!isEmbedServer || !selectedEpisode) return
    const iframe = iframeRef.current
    if (!iframe) return

    const animeId = extractAnimeIdFromUrl(path)
    const progressKey = `progress:${animeId}:${selectedEpisode.num}`
    let restoreDone = false

    const savedTime = storageGet<number>(progressKey) || 0

    const saveProgress = (currentTime: number) => {
      storageSet(progressKey, Math.floor(currentTime))
      broadcastProgress(Math.floor(currentTime))
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return
      if (!e.data?.type) return

      console.log("[v0] Saturn message received:", e.data.type, e.data)

      if (e.data.type === "saturn-video-ended") {
        console.log("[v0] Saturn video ended detected! autoNext:", autoNext, "selectedEpisode:", selectedEpisode?.num)
        if (!autoNext || !selectedEpisode) {
          console.log("[v0] Saturn auto-next skipped - autoNext:", autoNext, "selectedEpisode:", selectedEpisode)
          return
        }
        const idx = episodes.findIndex((ep) => epKey(ep) === epKey(selectedEpisode))
        console.log("[v0] Saturn auto-next - current index:", idx, "total episodes:", episodes.length)
        if (idx >= 0 && idx + 1 < episodes.length) {
          const next = episodes[idx + 1]
          console.log("[v0] Saturn auto-next - moving to episode:", next.num)
          setSelectedKey(epKey(next))
        } else {
          console.log("[v0] Saturn auto-next - no next episode available")
        }
      }

      if (e.data.type === "saturn-progress" && typeof e.data.currentTime === "number") {
        saveProgress(e.data.currentTime)
      }
    }

    window.addEventListener("message", handleMessage)

    const sendResume = () => {
      if (savedTime > 0 && !restoreDone && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "resume-video", time: savedTime }, "*")
        restoreDone = true
      }
    }

    sendResume()

    iframe.addEventListener("load", sendResume)

    return () => {
      window.removeEventListener("message", handleMessage)
      iframe.removeEventListener("load", sendResume)
    }
  }, [isEmbedServer, selectedEpisode, path, autoNext, episodes])

  async function saveContinueForClick(ep: Episode) {
    try {
      const seriesKey = seriesBaseFromPath(path)
      const seriesPath = seriesKey
      await fetch("/api/user-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "continue",
          seriesKey,
          seriesPath,
          title: seriesTitle || "Anime",
          episode: { num: ep.num, href: ep.href },
          position_seconds: 0,
        }),
      })
      broadcastProgress(0)
    } catch {}
  }

  const broadcastProgress = (seconds: number) => {
    try {
      const detail = {
        seriesKey: seriesKeyForStore,
        episodeNum: selectedEpisode?.num ?? 0,
        position: Math.floor(seconds || 0),
      }
      window.dispatchEvent(new CustomEvent("anizone:progress", { detail }))
    } catch {}
  }

  const sendProgress = (seconds: number, opts?: { keepalive?: boolean; immediate?: boolean }) => {
    const now = Date.now()
    const progressed = Math.abs(seconds - lastSentSecRef.current)
    const shouldThrottle = !opts?.immediate && now - lastSentAtRef.current < 8000 && progressed < 5
    if (shouldThrottle) return
    lastSentAtRef.current = now
    lastSentSecRef.current = seconds

    const payload = {
      op: "continue",
      seriesKey: seriesKeyForStore,
      seriesPath: seriesKeyForStore,
      title: seriesTitle || "Anime",
      episode: { num: selectedEpisode?.num ?? 0, href: selectedEpisode?.href ?? "" },
      position_seconds: Math.floor(seconds),
    }

    broadcastProgress(payload.position_seconds)

    try {
      if (opts?.keepalive && "sendBeacon" in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
        navigator.sendBeacon("/api/user-state", blob)
        return
      }
    } catch {}

    fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      keepalive: opts?.keepalive === true,
    }).catch(() => {})
  }

  const onEnd = () => {
    if (!autoNext || !selectedEpisode) return
    const idx = episodes.findIndex((e) => epKey(e) === epKey(selectedEpisode))
    if (idx >= 0 && idx + 1 < episodes.length) {
      const next = episodes[idx + 1]
      setSelectedKey(epKey(next))
    }
  }

  return (
    <div className="w-full space-y-3">
      {nextEpisodeDate && nextEpisodeTime && (
        <EpisodeCountdown nextEpisodeDate={nextEpisodeDate} nextEpisodeTime={nextEpisodeTime} className="text-sm" />
      )}

      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Episodi</div>
          <div className="flex items-center gap-3 flex-wrap">
            {availableServers.length > 1 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="server-select" className="text-xs text-muted-foreground">
                  Server:
                </Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-[100px] h-7 text-xs" id="server-select">
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServers.map((server) => (
                      <SelectItem key={server} value={server} className="text-xs">
                        {serverDisplayNames[server as keyof typeof serverDisplayNames] || server}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAnimePahe && (
              <div className="flex items-center gap-2">
                <Label htmlFor="resolution-select" className="text-xs text-muted-foreground">
                  Qualità:
                </Label>
                <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                  <SelectTrigger className="w-[90px] h-7 text-xs" id="resolution-select">
                    <SelectValue placeholder="Risoluzione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableResolutions.map((res) => (
                      <SelectItem key={res} value={res} className="text-xs">
                        {res}p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch id="auto-next" checked={autoNext} onCheckedChange={setAutoNext} />
              <Label htmlFor="auto-next" className="text-xs text-muted-foreground cursor-pointer">
                Auto-next
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x pb-1">
          {loadingEpisodes ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 w-14 rounded-full bg-neutral-800 animate-pulse shrink-0" />
            ))
          ) : episodes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessun episodio trovato.</div>
          ) : (
            episodes.map((e) => {
              const key = epKey(e)
              const active = selectedKey === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedKey(key)
                    saveContinueForClick(e)
                  }}
                  className={`shrink-0 snap-start px-3 h-9 rounded-full text-sm border ${
                    active
                      ? "bg-neutral-100 text-black border-neutral-100 dark:bg-neutral-900 dark:text-white dark:border-neutral-900"
                      : "bg-white text-black dark:bg-neutral-800 dark:text-white/90"
                  }`}
                  aria-pressed={active}
                >
                  {"E" + e.num}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="text-white flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento...
          </div>
        ) : embedUrl ? (
          <iframe
            key={embedUrl}
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            width="380"
            height="215"
            loading="lazy"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={`${seriesTitle} - Episodio ${selectedEpisode?.num || ""}`}
          />
        ) : proxyUrl ? (
          <video
            key={proxyUrl}
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            autoPlay={autoNext}
            onEnded={onEnd}
            src={proxyUrl}
            onError={() => {
              setError("Errore di riproduzione. Riprovo...")
              if (selectedEpisode) localStorage.removeItem(`anizone:stream:${epKey(selectedEpisode)}`)
              setProxyUrl(null)
              setTimeout(() => {
                setSelectedKey((k) => (k ? `${k}` : k))
              }, 200)
            }}
          />
        ) : !selectedEpisode ? (
          <div className="text-sm text-neutral-200 p-4 text-center">
            Seleziona un episodio per iniziare la riproduzione.
          </div>
        ) : (
          <div className="text-sm text-neutral-200 p-4 text-center">{error || "Caricamento in corso..."}</div>
        )}
      </div>

      {(isEmbedServer || isAnimePahe) && (
        <div className="text-xs text-muted-foreground">
          Stai guardando tramite{" "}
          {serverDisplayNames[selectedServer as keyof typeof serverDisplayNames] || selectedServer}.
          {isAnimePahe && ` Risoluzione: ${selectedResolution}p.`}
          {isEmbedServer &&
            " Il controllo della riproduzione e il salvataggio della posizione potrebbero essere limitati."}
        </div>
      )}
    </div>
  )
}
