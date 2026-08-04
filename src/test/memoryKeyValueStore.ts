import type { KeyValueRead, KeyValueStore } from '../shared/ports'
import { err, ok, type Result } from '../shared/result'

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>()
  private readonly getBehavior: 'normal' | 'unavailable'
  private readonly setFails: boolean

  constructor(options?: { unavailable?: boolean; setFails?: boolean }) {
    this.getBehavior = options?.unavailable ? 'unavailable' : 'normal'
    this.setFails = options?.setFails ?? false
  }

  get(key: string): KeyValueRead {
    if (this.getBehavior === 'unavailable') return { kind: 'unavailable' }
    const value = this.values.get(key)
    if (value === undefined) return { kind: 'absent' }
    return { kind: 'present', value }
  }

  set(key: string, value: string): Result<void, string> {
    if (this.getBehavior === 'unavailable' || this.setFails) {
      return err('blocked')
    }
    this.values.set(key, value)
    return ok()
  }

  remove(key: string): void {
    if (this.getBehavior !== 'unavailable') {
      this.values.delete(key)
    }
  }

  seed(key: string, value: string): void {
    this.values.set(key, value)
  }
}
