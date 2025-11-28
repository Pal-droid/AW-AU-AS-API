export type ListName = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

export type ContinueEntry = {
  seriesKey: string // e.g. /play/slug
  seriesPath: string // same as seriesKey
  title: string
  episode: { num: number; href: string }
  updatedAt: number
  positionSeconds?: number
}

export type ListItem = {
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
  addedAt: number
}

export type UserState = {
  continueWatching: Record<string, ContinueEntry> // keyed by seriesKey
  lists: Record<ListName, Record<string, ListItem>> // list -> (seriesKey -> item)
}

const defaultState = (): UserState => ({
  continueWatching: {},
  lists: {
    planning: {},
    completed: {},
    current: {},
    dropped: {},
    repeating: {},
    paused: {},
  },
})

const STORE = new Map<string, UserState>()

export function getState(userId: string): UserState {
  if (!STORE.has(userId)) STORE.set(userId, defaultState())
  return STORE.get(userId)!
}

export function setContinue(userId: string, entry: ContinueEntry & { positionSeconds?: number }) {
  const s = getState(userId)
  s.continueWatching[entry.seriesKey] = entry
}

export function addToList(userId: string, list: ListName, item: ListItem) {
  const s = getState(userId)

  // Remove any existing entries with the same seriesKey to prevent duplicates
  for (const listName of Object.keys(s.lists) as ListName[]) {
    if (s.lists[listName][item.seriesKey]) {
      delete s.lists[listName][item.seriesKey]
    }
  }

  // Add to the specified list
  s.lists[list][item.seriesKey] = item
}

export function removeFromList(userId: string, list: ListName, seriesKey: string) {
  const s = getState(userId)
  delete s.lists[list][seriesKey]
}

export function normalizeSeriesKey(path: string): string {
  try {
    // Handle URL objects
    const url = new URL(path, "https://dummy.local")
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) {
      return `/${parts[0]}/${parts[1]}`
    }
    return url.pathname
  } catch {
    // Handle relative paths
    const parts = path.split("/").filter(Boolean)
    if (parts.length >= 2) {
      return `/${parts[0]}/${parts[1]}`
    }
    return path.startsWith("/") ? path : `/${path}`
  }
}

export function getPublicState(userId: string) {
  // Directly return state for anonymous users (no secrets here)
  return getState(userId)
}
