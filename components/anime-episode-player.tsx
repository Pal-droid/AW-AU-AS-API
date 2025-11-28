"use client"

import { useState } from "react"
import { HLSVideoPlayer } from "@/components/hls-video-player"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Download, Share2, Heart, Clock } from "lucide-react"

interface Episode {
  id: string
  number: number
  title: string
  m3u8Url: string
  duration?: string
  thumbnail?: string
}

interface AnimeEpisodePlayerProps {
  anime: {
    title: string
    description: string
    genre: string[]
    year: number
    status: string
  }
  episode: Episode
  episodes: Episode[]
  onEpisodeChange?: (episode: Episode) => void
}

export function AnimeEpisodePlayer({ anime, episode, episodes, onEpisodeChange }: AnimeEpisodePlayerProps) {
  const [isPlayerVisible, setIsPlayerVisible] = useState(false)

  const handlePlayEpisode = (selectedEpisode: Episode) => {
    onEpisodeChange?.(selectedEpisode)
    setIsPlayerVisible(true)
  }

  const handleClosePlayer = () => {
    setIsPlayerVisible(false)
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl font-[var(--font-playfair)] mb-2">{anime.title}</CardTitle>
              <CardDescription className="text-base mb-4">{anime.description}</CardDescription>
              <div className="flex flex-wrap gap-2 mb-4">
                {anime.genre.map((g) => (
                  <Badge key={g} variant="secondary" className="glass">
                    {g}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{anime.year}</span>
                <span>•</span>
                <span>{anime.status}</span>
                <span>•</span>
                <span>{episodes.length} episodi</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="glass bg-transparent">
                <Heart className="w-4 h-4 mr-2" />
                Preferiti
              </Button>
              <Button variant="outline" size="sm" className="glass bg-transparent">
                <Share2 className="w-4 h-4 mr-2" />
                Condividi
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isPlayerVisible && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Episodio {episode.number}: {episode.title}
                </CardTitle>
                <CardDescription>Streaming tramite proxy AnimeSaturn</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleClosePlayer} className="glass bg-transparent">
                Chiudi Player
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <HLSVideoPlayer
              m3u8Url={episode.m3u8Url}
              title={`${anime.title} - Episodio ${episode.number}`}
              className="w-full aspect-video"
              autoPlay={true}
            />
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle>Lista Episodi</CardTitle>
          <CardDescription>Seleziona un episodio da guardare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodes.map((ep) => (
              <Card
                key={ep.id}
                className={`glass cursor-pointer transition-smooth hover:glow ${
                  episode.id === ep.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handlePlayEpisode(ep)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">Episodio {ep.number}</h3>
                      <p className="text-sm text-muted-foreground truncate">{ep.title}</p>
                      {ep.duration && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {ep.duration}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Azioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="glass bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Scarica Episodio
            </Button>
            <Button variant="outline" className="glass bg-transparent">
              <Share2 className="w-4 h-4 mr-2" />
              Condividi Episodio
            </Button>
            <Button variant="outline" className="glass bg-transparent">
              <Heart className="w-4 h-4 mr-2" />
              Aggiungi ai Preferiti
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
