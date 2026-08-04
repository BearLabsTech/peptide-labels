import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installMemoryLocalStorage } from '../test/memoryLocalStorage'
import {
    clearPrintSetup,
    loadPrintSetup,
    normalizePrintSetup,
    PRINT_SETUP_SAVE_FAILED_MESSAGE,
    PRINT_SETUP_UNREADABLE_MESSAGE,
    resolveInitialPrintSetup,
    savePrintSetup,
} from './printStorage'
import { MemoryKeyValueStore } from '../test/memoryKeyValueStore'

const STORAGE_KEY = 'peptide-labels-print-setup'

describe('print setup persistence', () => {
    beforeEach(() => {
        installMemoryLocalStorage()
        vi.restoreAllMocks()
    })

    it('should report absent when storage is empty', () => {
        expect(loadPrintSetup()).toEqual({ kind: 'absent' })
    })

    it('should report corrupt for malformed JSON or invalid shape', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        localStorage.setItem(STORAGE_KEY, '{invalid')
        expect(loadPrintSetup()).toEqual({ kind: 'corrupt' })

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ widthMm: 'wide' }))
        expect(loadPrintSetup()).toEqual({ kind: 'corrupt' })

        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        expect(loadPrintSetup()).toEqual({ kind: 'corrupt' })

        errorSpy.mockRestore()
    })

    it('should report unavailable when browser storage cannot be read', () => {
        delete (globalThis as { localStorage?: Storage }).localStorage
        expect(loadPrintSetup()).toEqual({ kind: 'unavailable' })
    })

    it('should save canonical state and load it unchanged', () => {
        expect(savePrintSetup({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        })).toEqual({ ok: true, value: undefined })

        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        })
        expect(loadPrintSetup()).toEqual({
            kind: 'ok',
            value: {
                printerId: 'niimbot-b21',
                stockId: '40x20-rounded',
                vialCapacityMl: 7.5,
            },
        })
    })

    it('should migrate legacy storage and clear persisted state', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            labelId: '50x30',
            vialMl: 10,
        }))

        expect(loadPrintSetup()).toEqual({
            kind: 'ok',
            value: {
                stockId: '50x30-rounded',
                vialCapacityMl: 10,
            },
        })

        clearPrintSetup()
        expect(loadPrintSetup()).toEqual({ kind: 'absent' })
    })

    it('should surface a settings-could-not-be-saved result when storage writes fail', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        localStorage.setItem = () => {
            throw new Error('blocked')
        }
        expect(savePrintSetup({ stockId: '40x20-rounded' })).toEqual({
            ok: false,
            error: PRINT_SETUP_SAVE_FAILED_MESSAGE,
        })

        installMemoryLocalStorage()
        localStorage.removeItem = () => {
            throw new Error('blocked')
        }
        expect(() => clearPrintSetup()).not.toThrow()
        errorSpy.mockRestore()
    })
})

describe('resolveInitialPrintSetup', () => {
    const defaults = normalizePrintSetup({})

    it('should use stored selection when load succeeds', () => {
        const store = new MemoryKeyValueStore()
        store.seed(STORAGE_KEY, JSON.stringify({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        }))

        expect(resolveInitialPrintSetup(store)).toEqual({
            selection: {
                printerId: 'niimbot-b21',
                stockId: '40x20-rounded',
                vialCapacityMl: 7.5,
            },
            loadNotice: null,
        })
    })

    it('should use defaults without notice when storage is absent or unavailable', () => {
        expect(resolveInitialPrintSetup(new MemoryKeyValueStore())).toEqual({
            selection: defaults,
            loadNotice: null,
        })
        expect(resolveInitialPrintSetup(new MemoryKeyValueStore({ unavailable: true }))).toEqual({
            selection: defaults,
            loadNotice: null,
        })
    })

    it('should self-heal corrupt storage and show a notice when the heal write succeeds', () => {
        const store = new MemoryKeyValueStore()
        store.seed(STORAGE_KEY, '{invalid')

        expect(resolveInitialPrintSetup(store)).toEqual({
            selection: defaults,
            loadNotice: PRINT_SETUP_UNREADABLE_MESSAGE,
        })
        expect(loadPrintSetup(store)).toEqual({ kind: 'ok', value: defaults })
    })

    it('should keep defaults in memory without a notice when corrupt self-heal write fails', () => {
        const store = new MemoryKeyValueStore({ setFails: true })
        store.seed(STORAGE_KEY, '{invalid')

        expect(resolveInitialPrintSetup(store)).toEqual({
            selection: defaults,
            loadNotice: null,
        })
    })
})
