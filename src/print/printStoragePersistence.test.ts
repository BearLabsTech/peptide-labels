import { beforeEach, describe, expect, it } from 'vitest'
import { installMemoryLocalStorage } from '../test/memoryLocalStorage'
import {
    clearPrintSetup,
    loadPrintSetup,
    savePrintSetup,
} from './printStorage'

const STORAGE_KEY = 'peptide-labels-print-setup'

describe('print setup persistence', () => {
    beforeEach(() => {
        installMemoryLocalStorage()
    })

    it('should return null when storage is empty or malformed', () => {
        expect(loadPrintSetup()).toBeNull()
        localStorage.setItem(STORAGE_KEY, '{invalid')
        expect(loadPrintSetup()).toBeNull()

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ widthMm: 'wide' }))
        expect(loadPrintSetup()).toBeNull()

        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        expect(loadPrintSetup()).toBeNull()
    })

    it('should save canonical state and load it unchanged', () => {
        savePrintSetup({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        })

        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        })
        expect(loadPrintSetup()).toEqual({
            printerId: 'niimbot-b21',
            stockId: '40x20-rounded',
            vialCapacityMl: 7.5,
        })
    })

    it('should migrate legacy storage and clear persisted state', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            labelId: '50x30',
            vialMl: 10,
        }))

        expect(loadPrintSetup()).toEqual({
            stockId: '50x30-rounded',
            vialCapacityMl: 10,
        })

        clearPrintSetup()
        expect(loadPrintSetup()).toBeNull()
    })

    it('should tolerate storage write and removal failures', () => {
        localStorage.setItem = () => {
            throw new Error('blocked')
        }
        expect(() => savePrintSetup({ stockId: '40x20-rounded' })).not.toThrow()

        installMemoryLocalStorage()
        localStorage.removeItem = () => {
            throw new Error('blocked')
        }
        expect(() => clearPrintSetup()).not.toThrow()
    })
})
