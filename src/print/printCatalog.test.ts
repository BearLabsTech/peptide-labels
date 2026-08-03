import { describe, it, expect } from 'vitest'
import { DEFAULT_STOCK_ID, getStockById, PRINT_CATALOG } from './printCatalog'
import { normalizePrintSetup } from './printStorage'

describe('printCatalog', () => {
  it('should derive the same printer/stock compatibility the two-source catalog declared', () => {
    // Pinned from the pre-collapse catalog data (commit e832113): every 40x20 and
    // 50x30 stock worked with all four printers; 40x30 excluded the M2, which has
    // no 40x30 support. If this changes, the catalog data changed, not the derivation.
    const expected: Record<string, readonly string[]> = {
      '40x20': ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro', 'niimbot-b1-pro'],
      '40x30': ['niimbot-b21', 'niimbot-b21-pro', 'niimbot-b1-pro'],
      '50x30': ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro', 'niimbot-b1-pro'],
    }
    for (const stock of PRINT_CATALOG.stocks) {
      const printers = PRINT_CATALOG.printers
        .filter((p) => (p.dimensionIds as readonly string[]).includes(stock.dimensionId))
        .map((p) => p.id)
      const expectedForDimension = expected[stock.dimensionId]
      expect(expectedForDimension, `unexpected dimensionId ${stock.dimensionId}`).toBeDefined()
      expect([...printers].sort()).toEqual([...expectedForDimension].sort())
    }

    for (const recommendation of PRINT_CATALOG.vialRecommendations) {
      expect(PRINT_CATALOG.stocks.some((stock) => stock.id === recommendation.stockId)).toBe(true)
    }
  })

  it('should default to 40x20 rounded stock', () => {
    expect(DEFAULT_STOCK_ID).toBe('40x20-rounded')
    expect(getStockById(DEFAULT_STOCK_ID)?.shape).toBe('rounded')
  })

  it('should list rounded and rectangular stocks for each common size', () => {
    expect(PRINT_CATALOG.stocks.length).toBe(6)
    expect(getStockById('40x20-rect')?.shape).toBe('rectangular')
    expect(getStockById('40x30-rounded')?.widthMm).toBe(40)
    expect(getStockById('40x30-rounded')?.heightMm).toBe(30)
    expect(getStockById('50x30-rect')?.shape).toBe('rectangular')
  })

  it('should include B1 Pro at 300 DPI with 40x30 support', () => {
    const b1Pro = PRINT_CATALOG.printers.find((p) => p.id === 'niimbot-b1-pro')
    expect(b1Pro?.dpi).toBe(300)
    expect(b1Pro?.dimensionIds).toContain('40x30')
  })

  it('should reject a mutation attempt on a getStockById result, not silently drop it', () => {
    const stock = getStockById(DEFAULT_STOCK_ID)
    expect(stock).toBeDefined()
    if (!stock) return

    const printer = PRINT_CATALOG.printers[0]
    // PRINT_CATALOG is deep-frozen, so the returned entry is the live catalog
    // object — a mutation attempt throws (strict mode) rather than silently
    // succeeding against a copy, which is a stronger guarantee than "the
    // catalog happens to be unaffected".
    expect(() => (printer.dimensionIds as unknown as string[]).push('injected-dimension-id')).toThrow(TypeError)
    expect(() => {
      ;(stock as { name: string }).name = 'mutated-stock-name'
    }).toThrow(TypeError)

    expect(getStockById(DEFAULT_STOCK_ID)?.name).toBe('40 × 20 mm — rounded')
  })

  it('should be frozen at every level', () => {
    expect(Object.isFrozen(PRINT_CATALOG)).toBe(true)
    expect(Object.isFrozen(PRINT_CATALOG.stocks)).toBe(true)
    expect(Object.isFrozen(PRINT_CATALOG.stocks[0])).toBe(true)
    expect(Object.isFrozen(PRINT_CATALOG.printers[0].dimensionIds)).toBe(true)
    expect(Object.isFrozen(PRINT_CATALOG.vialRecommendations)).toBe(true)
  })
})

describe('printStorage normalizePrintSetup', () => {
  it('should apply default stock when selection is empty', () => {
    expect(normalizePrintSetup({})).toEqual({
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should apply default stock when only printer is selected', () => {
    expect(normalizePrintSetup({ printerId: 'niimbot-b21' })).toEqual({
      printerId: 'niimbot-b21',
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should not add stockId for custom dimensions', () => {
    expect(normalizePrintSetup({ widthMm: 40, heightMm: 20 })).toEqual({
      widthMm: 40,
      heightMm: 20,
      vialCapacityMl: 3,
    })
  })

  it('should migrate legacy labelId 40x20 to rounded stock', () => {
    expect(normalizePrintSetup({ labelId: '40x20' })).toEqual({
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should migrate legacy labelId 50x30 to rounded stock', () => {
    expect(normalizePrintSetup({ labelId: '50x30' })).toEqual({
      stockId: '50x30-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should migrate legacy labelId 40x30 to rounded stock', () => {
    expect(normalizePrintSetup({ labelId: '40x30' })).toEqual({
      stockId: '40x30-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should strip legacy labelId when stockId is present', () => {
    expect(normalizePrintSetup({ stockId: '40x20-rounded', labelId: '40x20' })).toEqual({
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
  })

  it('should migrate legacy vial capacity and preserve canonical selections', () => {
    expect(
      normalizePrintSetup({ printerId: 'niimbot-b21', vialMl: 3, stockId: '40x20-rounded' }),
    ).toEqual({
      printerId: 'niimbot-b21',
      vialCapacityMl: 3,
      stockId: '40x20-rounded',
    })
    expect(normalizePrintSetup({ vialCapacityMl: 20 })).toEqual({
      vialCapacityMl: 20,
      stockId: '40x20-rounded',
    })
  })

  it('should reject persisted capacities below 1 ml', () => {
    expect(normalizePrintSetup({ vialCapacityMl: 0.5 }).vialCapacityMl).toBe(3)
  })

  it('should discard invalid or stale custom dimensions when using catalog stock', () => {
    expect(normalizePrintSetup({ widthMm: -40, heightMm: 20 })).toEqual({
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
    expect(normalizePrintSetup({
      stockId: '40x20-rounded',
      widthMm: 50,
      heightMm: 30,
    })).toEqual({
      stockId: '40x20-rounded',
      vialCapacityMl: 3,
    })
  })
})
