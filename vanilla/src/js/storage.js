/**
 * localStorage caching utility
 * Persists user inputs (appId, token, avatar ID, etc.) across page refreshes
 */

const STORAGE_PREFIX = 'avatarkit_demo_'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Ignore quota errors, private browsing restrictions, etc.
  }
}

export function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export function saveSessionToken(token) {
  if (!token) {
    removeFromStorage('sessionToken')
    return
  }
  saveToStorage('sessionToken', { value: token, timestamp: Date.now() })
}

export function loadSessionToken() {
  try {
    const data = loadFromStorage('sessionToken', null)
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

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Ignore
  }
}
