"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw } from "lucide-react"
import Hls from "hls.js"

interface VideoPlayerProps {
  src: string
  title?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  startTime?: number
  isHls?: boolean
}

export function VideoPlayer({
  src,
  title,
  onTimeUpdate,
  startTime = 0,
  isHls = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // --- Initialize HLS only once per src ---
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const isM3u8 = isHls || src.endsWith(".m3u8")

    if (isM3u8) {
      if (Hls.isSupported()) {
        cleanup()
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Only autoplay if user already clicked play
          if (isPlaying) video.play().catch(() => {})
        })

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("[HLS error]", data)
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break
              case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break
              default: cleanup(); break
            }
          }
        })
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src
      } else {
        console.warn("HLS not supported in this browser")
      }
    } else {
      cleanup()
      video.src = src
    }

    return cleanup
  }, [src])

  // --- Track metadata, time updates, play/pause ---
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      if (startTime > 0) video.currentTime = startTime
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime, video.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [onTimeUpdate, startTime])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    isPlaying ? video.pause() : video.play().catch(() => {})
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    video.currentTime = percent * duration
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return
    if (!document.fullscreenElement) container.requestFullscreen()
    else document.exitFullscreen()
    setIsFullscreen(!isFullscreen)
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group shadow-2xl"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-20 h-20 bg-primary/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary/30 transition-all duration-200 hover:scale-110"
            >
              <Play className="w-10 h-10 text-white ml-1" />
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          <div
            className="w-full h-2 bg-white/20 rounded-full cursor-pointer hover:h-3 transition-all duration-200"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-200 relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-all duration-200 hover:scale-110">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button onClick={toggleMute} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-all duration-200 hover:scale-110">
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <button onClick={() => skip(-10)} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-all duration-200 hover:scale-110">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => skip(10)} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-all duration-200 hover:scale-110">
                <RotateCw className="w-5 h-5" />
              </button>
              <span className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center text-white hover:text-primary transition-all duration-200 hover:scale-110">
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
