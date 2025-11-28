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

interface Chapter {
  title: string
  url: string
  date: string
}

interface Volume {
  name: string
  chapters: Chapter[]
}

interface ChapterProgressDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (chapterTitle: string, chapterUrl: string) => void
  mangaId: string
  mangaTitle: string
  volumes: Volume[]
}

export function ChapterProgressDialog({
  isOpen,
  onClose,
  onConfirm,
  mangaId,
  mangaTitle,
  volumes,
}: ChapterProgressDialogProps) {
  const [selectedChapter, setSelectedChapter] = useState<{ title: string; url: string } | null>(null)
  const [manualChapter, setManualChapter] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Set default to first chapter when dialog opens
  useEffect(() => {
    if (isOpen && volumes.length > 0 && volumes[0].chapters.length > 0) {
      const firstChapter = volumes[0].chapters[0]
      setSelectedChapter({
        title: firstChapter.title,
        url: firstChapter.url,
      })
      setManualChapter("")
    }
  }, [isOpen, volumes])

  const handleConfirm = () => {
    if (selectedChapter) {
      onConfirm(selectedChapter.title, selectedChapter.url)
    } else if (manualChapter.trim()) {
      onConfirm(manualChapter.trim(), "")
    }
    onClose()
  }

  const allChapters = volumes.flatMap((volume) =>
    volume.chapters.map((chapter) => ({
      ...chapter,
      volumeName: volume.name,
    })),
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleziona Capitolo</DialogTitle>
          <DialogDescription>Scegli da quale capitolo stai leggendo "{mangaTitle}"</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {allChapters.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Capitolo corrente:</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {allChapters.slice(0, 30).map((chapter, index) => (
                    <Button
                      key={index}
                      variant={
                        selectedChapter?.url === chapter.url && selectedChapter?.title === chapter.title
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setSelectedChapter({
                          title: chapter.title,
                          url: chapter.url,
                        })
                      }
                      className="w-full justify-start text-left h-auto py-2 px-3"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground">{chapter.volumeName}</span>
                        <span className="text-sm">
                          {chapter.title
                            .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, "")
                            .replace(/\s*$$\d{1,2}\/\d{1,2}\/\d{4}$$.*$/, "")}
                        </span>
                      </div>
                    </Button>
                  ))}
                  {allChapters.length > 30 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{allChapters.length - 30} altri capitoli
                    </p>
                  )}
                </div>
                {allChapters.length > 0 && (
                  <p className="text-xs text-muted-foreground">Disponibili {allChapters.length} capitoli</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-chapter">O inserisci manualmente:</Label>
                <Input
                  id="manual-chapter"
                  type="text"
                  value={manualChapter}
                  onChange={(e) => {
                    setManualChapter(e.target.value)
                    if (e.target.value.trim()) {
                      setSelectedChapter(null)
                    }
                  }}
                  placeholder="Es. Capitolo 1, Vol. 1 - Cap. 5"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="manual-chapter-only">Inserisci capitolo:</Label>
              <Input
                id="manual-chapter-only"
                type="text"
                value={manualChapter}
                onChange={(e) => setManualChapter(e.target.value)}
                placeholder="Es. Capitolo 1, Vol. 1 - Cap. 5"
              />
              <p className="text-xs text-muted-foreground">Nessun capitolo disponibile, inserisci manualmente</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={loading || (!selectedChapter && !manualChapter.trim())}>
            Aggiungi a In Corso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
