import { describe, expect, it } from 'vitest'
import { HeuristicTextMeasurer } from './HeuristicTextMeasurer'

describe('HeuristicTextMeasurer', () => {
  const measurer = new HeuristicTextMeasurer()

  it('should return zero for empty text or non-positive font size', () => {
    expect(measurer.measureWidthPx('', 20, 900)).toBe(0)
    expect(measurer.measureWidthPx('HGH', 0, 900)).toBe(0)
  })

  it('should measure wider glyphs as wider than narrow ones at the same size', () => {
    const narrow = measurer.measureWidthPx('iii', 20, 600)
    const wide = measurer.measureWidthPx('mmm', 20, 600)
    expect(wide).toBeGreaterThan(narrow)
  })

  it('should scale width linearly with font size', () => {
    const at10 = measurer.measureWidthPx('Tirzepatide', 10, 900)
    const at20 = measurer.measureWidthPx('Tirzepatide', 20, 900)
    expect(at20).toBeCloseTo(at10 * 2, 5)
  })

  it('should measure heavier weights slightly wider than lighter ones', () => {
    const body = measurer.measureWidthPx('HGH', 20, 600)
    const title = measurer.measureWidthPx('HGH', 20, 900)
    expect(title).toBeGreaterThan(body)
  })
})
