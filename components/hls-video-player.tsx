"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface HLSVideoPlayerProps {
  m3u8Url: string
  title?: string
  className?: string
  autoPlay?: boolean
}

export function HLSVideoPlayer({ m3u8Url, title, className, autoPlay = false }: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([100])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const proxiedUrl = `https://animesaturn-proxy.onrender.com/proxy?url=${encodeURIComponent(m3u8Url)}`

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const loadHLS = async () => {
      try {
        const Hls = (await import("hls.js")).default

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            debug: true,
            xhrSetup: (xhr: XMLHttpRequest, url: string) => {
              console.log("[v0] HLS.js requesting:", url)
              xhr.setRequestHeader("Accept", "application/vnd.apple.mpegurl, application/x-mpegURL, */*")
            },
          })

          hlsRef.current = hls

          hls.loadSource(proxiedUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("[v0] HLS manifest parsed successfully")
            setIsLoading(false)
            if (autoPlay) {
              video.play()
            }
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error("[v0] HLS error:", data)

            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                console.error("[v0] Failed to load M3U8 manifest - likely received HTML instead")
                setError(
                  "Errore nel caricamento del manifest M3U8. Il server potrebbe aver restituito HTML invece del playlist.",
                )
              } else {
                console.error("[v0] Network error:", data.details)
                setError("Errore di rete durante il caricamento")
              }
            } else if (data.fatal) {
              setError("Errore fatale nella riproduzione HLS")
              setIsLoading(false)
            }
          })

          hls.on(Hls.Events.MANIFEST_LOADING, (event, data) => {
            console.log("[v0] Loading manifest from:", data.url)
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          console.log("[v0] Using native HLS support")
          video.src = proxiedUrl
          setIsLoading(false)
        } else {
          setError("Il tuo browser non supporta la riproduzione HLS")
          setIsLoading(false)
        }
      } catch (err) {
        console.error("[v0] Error loading HLS:", err)
        setError("Errore nel caricamento del player")
        setIsLoading(false)
      }
    }

    loadHLS()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [proxiedUrl, autoPlay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => {
      setVolume([video.volume * 100])
      setIsMuted(video.muted)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("volumechange", handleVolumeChange)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("volumechange", handleVolumeChange)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = value[0] / 100
    video.volume = newVolume
    setVolume(value)

    if (newVolume === 0) {
      video.muted = true
    } else if (video.muted) {
      video.muted = false
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = (value[0] / 100) * duration
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!document.fullscreenElement) {
      video.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const retryLoad = () => {
    setError(null)
    setIsLoading(true)
    const video = videoRef.current
    if (video && hlsRef.current) {
      hlsRef.current.loadSource(proxiedUrl)
    }
  }

  if (error) {
    return (
      <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
        <div className="flex flex-col items-center justify-center h-64 text-white">
          <p className="text-lg mb-4">{error}</p>
          <Button
            onClick={retryLoad}
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-black bg-transparent"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Riprova
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("relative bg-black rounded-lg overflow-hidden group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {title && (
        <div className="absolute top-4 left-4 z-20 bg-black/70 px-3 py-1 rounded text-white text-sm">{title}</div>
      )}

      <video ref={videoRef} className="w-full h-full" onClick={togglePlay} onDoubleClick={toggleFullscreen} />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[duration ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <div className="w-24">
              <Slider value={volume} onValueChange={handleVolumeChange} max={100} step={1} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Settings className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
