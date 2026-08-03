import { describe, expect, it } from 'vitest'
import {
    computeCustomDimensionsValid,
    computeUseCustomSize,
    customHeightPatch,
    customWidthPatch,
    enableCustomSizeState,
    isPersistedCustomSize,
    selectCatalogStockPatch,
} from './usePrintSetupSectionViewModel'
import type { PrintSetupSelection } from '../../../print/types'

describe('isPersistedCustomSize', () => {
    it('should be true once width and height are set with no catalog stock', () => {
        expect(isPersistedCustomSize({ widthMm: 40, heightMm: 30 })).toBe(true)
    })

    it('should be false when a catalog stock is selected even if dimensions are present', () => {
        expect(isPersistedCustomSize({ stockId: '40x20-rounded', widthMm: 40, heightMm: 20 })).toBe(false)
    })

    it('should be false when either dimension is missing', () => {
        expect(isPersistedCustomSize({ widthMm: 40 })).toBe(false)
        expect(isPersistedCustomSize({})).toBe(false)
    })
})

describe('computeUseCustomSize', () => {
    it('should show the custom panel once the user explicitly requests it', () => {
        expect(computeUseCustomSize(true, { stockId: '40x20-rounded' })).toBe(true)
    })

    it('should show the custom panel for an already-persisted custom selection without a request', () => {
        expect(computeUseCustomSize(false, { widthMm: 45, heightMm: 25 })).toBe(true)
    })

    it('should stay on the catalog panel otherwise', () => {
        expect(computeUseCustomSize(false, { stockId: '40x20-rounded' })).toBe(false)
    })
})

describe('computeCustomDimensionsValid', () => {
    it('should require both width and height to parse as positive mm values', () => {
        expect(computeCustomDimensionsValid('40', '20')).toBe(true)
        expect(computeCustomDimensionsValid('0', '20')).toBe(false)
        expect(computeCustomDimensionsValid('40', 'abc')).toBe(false)
        expect(computeCustomDimensionsValid('', '')).toBe(false)
    })
})

describe('selectCatalogStockPatch', () => {
    it('should select the stock and clear any custom dimensions or legacy label id', () => {
        expect(selectCatalogStockPatch('50x30-rectangular')).toEqual({
            stockId: '50x30-rectangular',
            labelId: undefined,
            widthMm: undefined,
            heightMm: undefined,
        })
    })
})

describe('enableCustomSizeState', () => {
    it('should seed the custom size from the currently selected catalog stock', () => {
        const selection: PrintSetupSelection = { stockId: '40x20-rounded' }
        const state = enableCustomSizeState(selection)
        expect(state.widthMm).toBe(40)
        expect(state.heightMm).toBe(20)
        expect(state.patch).toEqual({ stockId: undefined, labelId: undefined, widthMm: 40, heightMm: 20 })
    })

    it('should fall back to any already-persisted custom dimensions when there is no catalog stock', () => {
        const selection: PrintSetupSelection = { widthMm: 55, heightMm: 35 }
        const state = enableCustomSizeState(selection)
        expect(state.widthMm).toBe(55)
        expect(state.heightMm).toBe(35)
    })

    it('should default to 40x20 when neither a catalog stock nor prior custom size exists', () => {
        const state = enableCustomSizeState({})
        expect(state.widthMm).toBe(40)
        expect(state.heightMm).toBe(20)
    })
})

describe('customWidthPatch / customHeightPatch', () => {
    it('should return a patch for a valid positive value', () => {
        expect(customWidthPatch('45')).toEqual({ widthMm: 45, stockId: undefined, labelId: undefined })
        expect(customHeightPatch('25')).toEqual({ heightMm: 25, stockId: undefined, labelId: undefined })
    })

    it('should return null for an invalid or non-positive value, leaving the selection untouched', () => {
        expect(customWidthPatch('abc')).toBeNull()
        expect(customWidthPatch('0')).toBeNull()
        expect(customWidthPatch('-5')).toBeNull()
        expect(customHeightPatch('')).toBeNull()
    })
})
