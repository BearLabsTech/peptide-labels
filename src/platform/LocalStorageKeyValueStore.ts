import type { KeyValueStore } from '../features/label/domain/ports'

/** Synchronous key/value store backed by `localStorage`. */
export class LocalStorageKeyValueStore implements KeyValueStore {
  get(key: string): string | null {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage can be unavailable in restricted browsing contexts.
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Clearing persisted preferences should not interrupt the app.
    }
  }
}
