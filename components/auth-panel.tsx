"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authManager } from "@/lib/auth"

type Mode = "login" | "signup"

export function AuthPanel({ onAuthChange }: { onAuthChange?: () => void } = {}) {
  const { user, setUser, login, signup, logout } = useAuth() // make sure your context exposes setUser
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)

  // Fetch profile picture whenever user logs in or token changes
  useEffect(() => {
    async function fetchProfile() {
      if (user?.token && !user.profile_picture_url) {
        try {
          const data = await authManager.fetchUserProfile()
          if (data?.profile_picture_url) {
            setUser((prev) => ({ ...prev!, profile_picture_url: data.profile_picture_url }))
          }
        } catch (e) {
          console.error("Failed to fetch profile picture:", e)
        }
      }
    }
    fetchProfile()
  }, [user?.token, setUser])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const result = mode === "login" ? await login(username, password) : await signup(username, password)

      if (!result.success) {
        setStatus(result.error || "Errore")
        return
      }

      if (mode === "signup") {
        setStatus("Registrazione completata. Ora effettua il login.")
        setMode("login")
      } else {
        setStatus("Login effettuato.")
        setUsername("")
        setPassword("")

        // Immediately fetch profile picture after login
        const data = await authManager.fetchUserProfile()
        if (data?.profile_picture_url) {
          setUser((prev) => ({ ...prev!, profile_picture_url: data.profile_picture_url }))
        }

        if (onAuthChange) onAuthChange()
      }
    } catch {
      setStatus("Errore di rete")
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    setBusy(true)
    setStatus(null)
    try {
      logout()
      setStatus("Disconnesso.")
      if (onAuthChange) onAuthChange()
    } catch {
      setStatus("Errore durante il logout")
    } finally {
      setBusy(false)
    }
  }

  async function handleProfilePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingPicture(true)
    try {
      const result = await authManager.uploadProfilePicture(file)

      if (result.success && result.profile_picture_url) {
        setUser((prev) => ({ ...prev!, profile_picture_url: result.profile_picture_url }))
        setStatus("Immagine profilo aggiornata!")
      } else {
        setStatus(result.error || "Errore durante il caricamento dell'immagine")
      }
    } catch {
      setStatus("Errore di rete durante il caricamento")
    } finally {
      setUploadingPicture(false)
    }
  }

  const loggedIn = !!user

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Account</CardTitle>
      </CardHeader>
      <CardContent>
        {loggedIn ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user.profile_picture_url || undefined} />
                  <AvatarFallback>
                    <User size={24} />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/80 transition-colors">
                  <Upload size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingPicture}
                  />
                </label>
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  Connesso come <span className="font-medium">{user.username}</span>
                </div>
                {uploadingPicture && <div className="text-xs text-muted-foreground">Caricamento...</div>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleLogout} disabled={busy}>
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="text-xs block mb-1">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nomeutente" />
            </div>
            <div>
              <label className="text-xs block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {mode === "login" ? "Login" : "Signup"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Vai a Signup" : "Vai a Login"}
              </Button>
            </div>
          </form>
        )}
        {status ? <div className="text-xs text-muted-foreground mt-2">{status}</div> : null}
      </CardContent>
    </Card>
  )
}
