import { describe, it, expect } from 'vitest'
import { DEFAULT_STOCK_ID, getStockById, PRINT_CATALOG } from './printCatalog'
import { normalizePrintSetup } from './printStorage'

describe('printCatalog', () => {
  it('should default to 40x20 rounded stock', () => {
    expect(DEFAULT_STOCK_ID).toBe('40x20-rounded')
    expect(getStockById(DEFAULT_STOCK_ID)?.shape).toBe('rounded')
  })

  it('should list rounded and rectangular stocks for each common size', () => {
    expect(PRINT_CATALOG.stocks.length).toBe(4)
    expect(getStockById('40x20-rect')?.shape).toBe('rectangular')
    expect(getStockById('50x30-rect')?.shape).toBe('rectangular')
  })
})

describe('printStorage normalizePrintSetup', () => {
  it('should apply default stock when selection is empty', () => {
    expect(normalizePrintSetup({})).toEqual({ stockId: '40x20-rounded' })
  })

  it('should apply default stock when only printer is selected', () => {
    expect(normalizePrintSetup({ printerId: 'niimbot-b21' })).toEqual({
      printerId: 'niimbot-b21',
      stockId: '40x20-rounded',
    })
  })

  it('should not add stockId for custom dimensions', () => {
    expect(normalizePrintSetup({ widthMm: 40, heightMm: 20 })).toEqual({
      widthMm: 40,
      heightMm: 20,
    })
  })

  it('should migrate legacy labelId 40x20 to rounded stock', () => {
    expect(normalizePrintSetup({ labelId: '40x20' })).toEqual({ stockId: '40x20-rounded' })
  })

  it('should migrate legacy labelId 50x30 to rounded stock', () => {
    expect(normalizePrintSetup({ labelId: '50x30' })).toEqual({ stockId: '50x30-rounded' })
  })

  it('should strip legacy labelId when stockId is present', () => {
    expect(normalizePrintSetup({ stockId: '40x20-rounded', labelId: '40x20' })).toEqual({
      stockId: '40x20-rounded',
    })
  })

  it('should preserve printer and vial selections', () => {
    expect(
      normalizePrintSetup({ printerId: 'niimbot-b21', vialMl: 3, stockId: '40x20-rounded' }),
    ).toEqual({ printerId: 'niimbot-b21', vialMl: 3, stockId: '40x20-rounded' })
  })
})
