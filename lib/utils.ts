import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const OBFUSCATION_KEY = "anizone2024"

export function obfuscateUrl(url: string): string {
  try {
    console.log("[v0] obfuscateUrl - input:", url)
    if (!url) {
      console.log("[v0] obfuscateUrl - empty input, returning empty string")
      return ""
    }
    // Simple obfuscation: base64 encode + character substitution
    const encoded = btoa(encodeURIComponent(url))
    // Character substitution to make it less obvious it's base64
    const obfuscated = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ".")

    // Add a simple prefix to make it look like a hash
    const result = `v${obfuscated}`
    console.log("[v0] obfuscateUrl - output:", result)
    return result
  } catch (e) {
    console.log("[v0] obfuscateUrl - error:", e)
    return url
  }
}

export function deobfuscateUrl(obfuscatedUrl: string): string {
  try {
    console.log("[v0] deobfuscateUrl - input:", obfuscatedUrl)
    if (!obfuscatedUrl) {
      console.log("[v0] deobfuscateUrl - empty input, returning empty string")
      return ""
    }
    // Remove prefix and reverse character substitution
    const withoutPrefix = obfuscatedUrl.startsWith("v") ? obfuscatedUrl.slice(1) : obfuscatedUrl
    const restored = withoutPrefix.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=")

    // Decode base64 and URI component
    const decoded = decodeURIComponent(atob(restored))
    console.log("[v0] deobfuscateUrl - output:", decoded)
    return decoded
  } catch (e) {
    console.log("[v0] deobfuscateUrl - error:", e)
    return obfuscatedUrl
  }
}

export function obfuscateId(id: string): string {
  try {
    // Simple ID obfuscation for manga IDs
    const encoded = btoa(id)
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ".")
  } catch {
    return id
  }
}

export function deobfuscateId(obfuscatedId: string): string {
  try {
    const restored = obfuscatedId.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=")
    return atob(restored)
  } catch {
    return obfuscatedId
  }
}
