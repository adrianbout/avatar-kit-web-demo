/**
 * localStorage caching utility
 * Persists user inputs (appId, token, avatar ID, etc.) across page refreshes
 */

const STORAGE_PREFIX = 'avatarkit_demo_'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

function isClient(): boolean {
  return typeof window !== 'undefined'
}

export function saveToStorage(key: string, value: unknown): void {
  if (!isClient()) return
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Ignore quota errors, private browsing restrictions, etc.
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isClient()) return defaultValue
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export function saveSessionToken(token: string): void {
  if (!token) {
    removeFromStorage('sessionToken')
    return
  }
  saveToStorage('sessionToken', { value: token, timestamp: Date.now() })
}

export function loadSessionToken(): string {
  if (!isClient()) return ''
  try {
    const data = loadFromStorage<{ value: string; timestamp: number } | null>('sessionToken', null)
    if (!data || !data.value) return ''
    if (Date.now() - data.timestamp > TOKEN_EXPIRY_MS) {
      removeFromStorage('sessionToken')
      return ''
    }
    return data.value
  } catch {
    return ''
  }
}

export function removeFromStorage(key: string): void {
  if (!isClient()) return
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Ignore
  }
}
