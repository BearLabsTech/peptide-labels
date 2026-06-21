import { describe, it, expect } from 'vitest'
import { filterCatalog } from './PrintCatalogFilter'

describe('PrintCatalogFilter', () => {
  it('should return all printers and labels when no facets selected', () => {
    const result = filterCatalog({})
    expect(result.printers.length).toBe(3)
    expect(result.labels.length).toBe(2)
    expect(result.recommendedLabelIds).toEqual([])
  })

  it('should filter labels to those compatible with B21', () => {
    const result = filterCatalog({ printerId: 'niimbot-b21' })
    expect(result.labels.every((l) => l.printerIds.includes('niimbot-b21'))).toBe(true)
    expect(result.labels.map((l) => l.id)).toContain('40x20')
  })

  it('should filter printers to those supporting 40x20 label', () => {
    const result = filterCatalog({ labelId: '40x20' })
    expect(result.printers.every((p) => p.labelIds.includes('40x20'))).toBe(true)
    expect(result.printers.map((p) => p.id)).toEqual(
      expect.arrayContaining(['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro']),
    )
  })

  it('should rank 40x20 first for 3 ml vial without removing other labels', () => {
    const result = filterCatalog({ vialMl: 3 })
    expect(result.labels.length).toBe(2)
    expect(result.recommendedLabelIds[0]).toBe('40x20')
  })

  it('should intersect printer and vial facets for labels and recommendations', () => {
    const result = filterCatalog({ printerId: 'niimbot-m2', vialMl: 3 })
    expect(result.labels.every((l) => l.printerIds.includes('niimbot-m2'))).toBe(true)
    expect(result.recommendedLabelIds).toContain('40x20')
  })
})
