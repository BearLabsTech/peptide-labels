import type { KeyValueRead, KeyValueStore } from '../shared/ports'
import type { Result } from '../shared/result'

const STORAGE_UNAVAILABLE = 'Browser storage is unavailable.'

/** Synchronous key/value store backed by `localStorage`. */
export class LocalStorageKeyValueStore implements KeyValueStore {
  get(key: string): KeyValueRead {
    if (typeof localStorage === 'undefined') return { kind: 'unavailable' }
    try {
      const value = localStorage.getItem(key)
      if (value === null) return { kind: 'absent' }
      return { kind: 'present', value }
    } catch (error) {
      console.error('localStorage get failed', error)
      return { kind: 'unavailable' }
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
