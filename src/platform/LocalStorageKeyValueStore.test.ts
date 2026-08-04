import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalStorageKeyValueStore } from './LocalStorageKeyValueStore'
import { installMemoryLocalStorage } from '../test/memoryLocalStorage'

describe('LocalStorageKeyValueStore', () => {
    beforeEach(() => {
        installMemoryLocalStorage()
        vi.restoreAllMocks()
    })

    it('should report absent when the key is missing', () => {
        const store = new LocalStorageKeyValueStore()
        expect(store.get('missing-key')).toEqual({ kind: 'absent' })
    })

    it('should report present when the key exists', () => {
        const store = new LocalStorageKeyValueStore()
        localStorage.setItem('test-key', 'value')
        expect(store.get('test-key')).toEqual({ kind: 'present', value: 'value' })
    })

    it('should report unavailable when localStorage is undefined', () => {
        delete (globalThis as { localStorage?: Storage }).localStorage
        const store = new LocalStorageKeyValueStore()
        expect(store.get('test-key')).toEqual({ kind: 'unavailable' })
    })

    it('should report unavailable when getItem throws', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        localStorage.getItem = () => {
            throw new Error('blocked')
        }
        const store = new LocalStorageKeyValueStore()
        expect(store.get('test-key')).toEqual({ kind: 'unavailable' })
        errorSpy.mockRestore()
    })
})
