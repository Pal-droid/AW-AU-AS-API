export const BACKEND_BASE = "https://stale-nananne-anizonee-3fa1a732.koyeb.app"

export const JWT_COOKIE = "azjwt"

export type BackendLists = {
  da_guardare?: string[]
  da_leggere?: string[]
  in_corso: string[]
  completati: string[]
  in_pausa: string[]
  abbandonati: string[]
  in_revisione: string[]
}

export type BackendContinueItem = {
  anime_id: string
  episode: number
  position_seconds: number
}

export type BackendUserData = {
  continue_watching: BackendContinueItem[]
  continue_reading: Record<string, any>
  continue_watching_series_movies: Record<string, any>
  anime_lists: BackendLists
  manga_lists: BackendLists
  lightnovel_lists: BackendLists
  series_movies_lists: BackendLists
}

export const mapLocalToBackendKey: Record<
  "planning" | "current" | "completed" | "paused" | "dropped" | "repeating",
  keyof BackendLists
> = {
  planning: "da_guardare",
  current: "in_corso",
  completed: "completati",
  paused: "in_pausa",
  dropped: "abbandonati",
  repeating: "in_revisione",
}

export const mapBackendToLocalKey: Record<keyof BackendLists, string> = {
  da_guardare: "planning",
  da_leggere: "planning", // 🔥 for manga/LN
  in_corso: "current",
  completati: "completed",
  in_pausa: "paused",
  abbandonati: "dropped",
  in_revisione: "repeating",
}

export async function getBackendAnimeData(token: string) {
  const response = await fetch(`${BACKEND_BASE}/user/anime-lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Backend anime data fetch failed:", response.status, errorText)
    throw new Error(`Failed to fetch anime data: ${response.status}`)
  }
  return await response.json()
}

export async function getBackendMangaData(token: string) {
  const response = await fetch(`${BACKEND_BASE}/user/manga-lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Backend manga data fetch failed:", response.status, errorText)
    throw new Error(`Failed to fetch manga data: ${response.status}`)
  }
  return await response.json()
}

export async function getBackendLightNovelData(token: string) {
  const response = await fetch(`${BACKEND_BASE}/user/lightnovel-lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Backend light novel data fetch failed:", response.status, errorText)
    throw new Error(`Failed to fetch light novel data: ${response.status}`)
  }
  return await response.json()
}

export async function getBackendContinueWatching(token: string) {
  const response = await fetch(`${BACKEND_BASE}/user/continue-watching`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Backend continue watching fetch failed:", response.status, errorText)
    throw new Error(`Failed to fetch continue watching: ${response.status}`)
  }
  return await response.json()
}

export async function getBackendContinueReading(token: string) {
  const response = await fetch(`${BACKEND_BASE}/user/continue-reading`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Backend continue reading fetch failed:", response.status, errorText)
    throw new Error(`Failed to fetch continue reading: ${response.status}`)
  }
  return await response.json()
}

export async function saveBackendAnimeData(token: string, data: BackendLists) {
  console.log("[v0] Saving anime data to backend:", data)
  const response = await fetch(`${BACKEND_BASE}/user/anime-lists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    console.error("[v0] Backend anime save failed:", response.status, text)
    throw new Error(`Save failed: ${text.slice(0, 200)}`)
  }
  console.log("[v0] Successfully saved anime data to backend")
}

export async function saveBackendMangaData(token: string, data: BackendLists) {
  console.log("[v0] Saving manga data to backend:", data)
  const response = await fetch(`${BACKEND_BASE}/user/manga-lists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    console.error("[v0] Backend manga save failed:", response.status, text)
    throw new Error(`Save failed: ${text.slice(0, 200)}`)
  }
  console.log("[v0] Successfully saved manga data to backend")
}

export async function saveBackendContinueWatching(token: string, data: Record<string, any>) {
  console.log("[v0] Saving continue watching to backend:", data)
  const response = await fetch(`${BACKEND_BASE}/user/continue-watching`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
    mode: "cors",
  })
  if (response.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    console.error("[v0] Backend continue watching save failed:", response.status, text)
    throw new Error(`Save failed: ${text.slice(0, 200)}`)
  }
  console.log("[v0] Successfully saved continue watching to backend")
}
