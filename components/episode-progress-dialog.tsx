"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface Episode {
  num: number
  href: string
}

interface EpisodeProgressDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (episodeNum: number) => void
  seriesPath: string
  seriesTitle: string
}

export function EpisodeProgressDialog({
  isOpen,
  onClose,
  onConfirm,
  seriesPath,
  seriesTitle,
}: EpisodeProgressDialogProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load episodes when dialog opens
  useEffect(() => {
    if (!isOpen || !seriesPath) return

    const loadEpisodes = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/episodes?path=${encodeURIComponent(seriesPath)}`)
        const data = await response.json()

        if (data.ok && data.episodes) {
          setEpisodes(data.episodes)
          setSelectedEpisode(1) // Default to episode 1
        } else {
          setError("Impossibile caricare gli episodi")
        }
      } catch (err) {
        setError("Errore nel caricamento degli episodi")
      } finally {
        setLoading(false)
      }
    }

    loadEpisodes()
  }, [isOpen, seriesPath])

  const handleConfirm = () => {
    onConfirm(selectedEpisode)
    onClose()
  }

  const handleEpisodeChange = (value: string) => {
    const num = Number.parseInt(value, 10)
    if (!isNaN(num) && num >= 1) {
      setSelectedEpisode(num)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleziona Episodio</DialogTitle>
          <DialogDescription>Scegli da quale episodio stai guardando "{seriesTitle}"</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento episodi...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <div className="space-y-2">
                <Label htmlFor="manual-episode">Inserisci episodio manualmente:</Label>
                <Input
                  id="manual-episode"
                  type="number"
                  min="1"
                  value={selectedEpisode}
                  onChange={(e) => handleEpisodeChange(e.target.value)}
                  placeholder="Numero episodio"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="episode-input">Episodio corrente:</Label>
                <Input
                  id="episode-input"
                  type="number"
                  min="1"
                  max={episodes.length || undefined}
                  value={selectedEpisode}
                  onChange={(e) => handleEpisodeChange(e.target.value)}
                />
                {episodes.length > 0 && (
                  <p className="text-xs text-muted-foreground">Disponibili {episodes.length} episodi</p>
                )}
              </div>

              {episodes.length > 0 && (
                <div className="space-y-2">
                  <Label>Episodi disponibili:</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {episodes.slice(0, 20).map((ep) => (
                      <Button
                        key={ep.num}
                        variant={selectedEpisode === ep.num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedEpisode(ep.num)}
                        className="h-8 px-3"
                      >
                        E{ep.num}
                      </Button>
                    ))}
                    {episodes.length > 20 && (
                      <span className="text-xs text-muted-foreground self-center">+{episodes.length - 20} altri</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            Aggiungi a In Corso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
