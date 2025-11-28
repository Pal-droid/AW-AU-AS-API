"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { authManager, type User } from "@/lib/auth"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = async () => {
    const currentUser = authManager.getUser()
    setUser(currentUser)

    if (currentUser?.token && !currentUser.profile_picture_url) {
      try {
        await authManager.fetchUserProfile()
        const updatedUser = authManager.getUser()
        setUser(updatedUser)
      } catch (error) {
        console.error("[v0] Failed to fetch user profile on refresh:", error)
      }
    }

    setIsLoading(false)
  }

  useEffect(() => {
    // Initial auth check
    refreshAuth()

    // Subscribe to auth changes
    const unsubscribe = authManager.subscribe((newUser) => {
      console.log("[v0] Auth state changed:", newUser?.username || "logged out")
      setUser(newUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (username: string, password: string) => {
    const result = await authManager.login(username, password)
    if (result.success) {
      try {
        await authManager.fetchUserProfile()
      } catch (error) {
        console.error("[v0] Failed to fetch user profile after login:", error)
      }
      refreshAuth()
    }
    return result
  }

  const signup = async (username: string, password: string) => {
    return await authManager.signup(username, password)
  }

  const logout = () => {
    authManager.logout()
    refreshAuth()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
