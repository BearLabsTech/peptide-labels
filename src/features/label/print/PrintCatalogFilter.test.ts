import { describe, it, expect } from 'vitest'
import { filterCatalog } from './PrintCatalogFilter'

describe('PrintCatalogFilter', () => {
  it('should return all printers and stocks when no facets selected', () => {
    const result = filterCatalog({})
    expect(result.printers.length).toBe(4)
    expect(result.stocks.length).toBe(6)
    expect(result.recommendedStockIds).toEqual([])
  })

  it('should filter stocks to those compatible with B21', () => {
    const result = filterCatalog({ printerId: 'niimbot-b21' })
    expect(result.stocks.every((s) => s.printerIds.includes('niimbot-b21'))).toBe(true)
    expect(result.stocks.map((s) => s.id)).toContain('40x20-rounded')
    expect(result.stocks.map((s) => s.id)).toContain('40x20-rect')
  })

  it('should filter printers to those supporting 40x20 dimension when stock selected', () => {
    const result = filterCatalog({ stockId: '40x20-rounded' })
    expect(result.printers.every((p) => p.labelIds.includes('40x20'))).toBe(true)
    expect(result.printers.map((p) => p.id)).toEqual(
      expect.arrayContaining(['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro', 'niimbot-b1-pro']),
    )
  })

  it('should rank 40x20 rounded first for 3 ml vial without removing other stocks', () => {
    const result = filterCatalog({ vialMl: 3 })
    expect(result.stocks.length).toBe(6)
    expect(result.recommendedStockIds[0]).toBe('40x20-rounded')
  })

  it('should rank 50x30 rounded first for 10 ml vial', () => {
    const result = filterCatalog({ vialMl: 10 })
    expect(result.recommendedStockIds[0]).toBe('50x30-rounded')
  })

  it('should intersect printer and vial facets for stocks and recommendations', () => {
    const result = filterCatalog({ printerId: 'niimbot-m2', vialMl: 3 })
    expect(result.stocks.every((s) => s.printerIds.includes('niimbot-m2'))).toBe(true)
    expect(result.recommendedStockIds).toContain('40x20-rounded')
  })
})
