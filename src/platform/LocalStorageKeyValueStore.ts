import type { KeyValueStore } from '../features/label/domain/ports'
import type { Result } from '../shared/result'

const STORAGE_UNAVAILABLE = 'Browser storage is unavailable.'

/** Synchronous key/value store backed by `localStorage`. */
export class LocalStorageKeyValueStore implements KeyValueStore {
  get(key: string): string | null {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('localStorage get failed', error)
      return null
    }
  }

  set(key: string, value: string): Result<void, string> {
    if (typeof localStorage === 'undefined') {
      return { ok: false, error: STORAGE_UNAVAILABLE }
    }
    try {
      localStorage.setItem(key, value)
      return { ok: true, value: undefined }
    } catch (error) {
      console.error('localStorage set failed', error)
      return { ok: false, error: STORAGE_UNAVAILABLE }
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('localStorage remove failed', error)
    }
  }
}
