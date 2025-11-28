"use client"

import { useState } from "react"
import { HLSVideoPlayer } from "@/components/hls-video-player"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, LinkIcon } from "lucide-react"

export default function PlayerPage() {
  const [m3u8Url, setM3u8Url] = useState("")
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")

  const exampleUrls = [
    {
      title: "Esempio 1 - Episodio Anime",
      url: "https://example-animesaturn.com/video/episode1/playlist.m3u8",
    },
    {
      title: "Esempio 2 - Episodio Anime",
      url: "https://example-animesaturn.com/video/episode2/playlist.m3u8",
    },
  ]

  const handleLoadVideo = () => {
    if (m3u8Url.trim()) {
      setCurrentVideo(m3u8Url.trim())
      setVideoTitle(videoTitle || "Video Anime")
    }
  }

  const handleExampleLoad = (url: string, title: string) => {
    setM3u8Url(url)
    setVideoTitle(title)
    setCurrentVideo(url)
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold font-[var(--font-playfair)] text-foreground">Player Video HLS</h1>
          <p className="text-muted-foreground text-lg font-[var(--font-source-sans)]">
            Riproduci video anime con URL m3u8 da AnimeSaturn
          </p>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Carica Video
            </CardTitle>
            <CardDescription>
              Inserisci l'URL m3u8 da AnimeSaturn. Il player utilizzerà automaticamente il proxy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL m3u8</label>
                <Input
                  placeholder="https://animesaturn.com/video/episode/playlist.m3u8"
                  value={m3u8Url}
                  onChange={(e) => setM3u8Url(e.target.value)}
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Titolo (opzionale)</label>
                <Input
                  placeholder="Nome dell'episodio"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="glass"
                />
              </div>
            </div>
            <Button onClick={handleLoadVideo} disabled={!m3u8Url.trim()} className="w-full md:w-auto">
              <Play className="w-4 h-4 mr-2" />
              Carica Video
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>URL di Esempio</CardTitle>
            <CardDescription>
              Clicca su uno degli esempi per testare il player (sostituisci con URL reali)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exampleUrls.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleExampleLoad(example.url, example.title)}
                  className="glass h-auto p-4 text-left justify-start"
                >
                  <div>
                    <div className="font-medium">{example.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{example.url}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {currentVideo && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Player Video</CardTitle>
              <CardDescription>URL processato tramite proxy: animesaturn-proxy.onrender.com</CardDescription>
            </CardHeader>
            <CardContent>
              <HLSVideoPlayer
                m3u8Url={currentVideo}
                title={videoTitle}
                className="w-full aspect-video"
                autoPlay={false}
              />
            </CardContent>
          </Card>
        )}

        <Card className="glass">
          <CardHeader>
            <CardTitle>Come Usare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">1. Ottieni l'URL m3u8</h3>
              <p className="text-muted-foreground text-sm">Trova l'URL del file m3u8 dall'episodio su AnimeSaturn</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2. Incolla l'URL</h3>
              <p className="text-muted-foreground text-sm">
                Il player processerà automaticamente l'URL tramite il proxy:
                <code className="bg-muted px-1 rounded text-xs ml-1">
                  animesaturn-proxy.onrender.com/proxy?url=&lt;m3u8_url&gt;
                </code>
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">3. Riproduci</h3>
              <p className="text-muted-foreground text-sm">
                Il player HLS.js caricherà e riprodurrà il video con controlli completi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
