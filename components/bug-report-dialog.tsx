"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bug, Construction } from "lucide-react"

interface BugReportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function BugReportDialog({ isOpen, onClose }: BugReportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-500" />
            Segnala Bug
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <Construction className="h-16 w-16 text-orange-500 animate-bounce" />
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Lavori in corso</h3>
            <p className="text-muted-foreground">
              Questa feature non è ancora pronta. Stiamo lavorando per implementare un sistema completo di segnalazione
              bug.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
