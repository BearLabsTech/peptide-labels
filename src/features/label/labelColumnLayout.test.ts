import { describe, it, expect } from 'vitest'
import { computeColumnLayout } from './labelColumnLayout'
import { MIN_CENTER_COLUMN_PERCENT } from './labelLayoutConstants'

describe('computeColumnLayout', () => {
  it('should size side columns as percent of inner flex row matching mm layout', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 20,
      qrColumnWidthPercent: 38,
    })

    expect(layout.innerRowMm).toBe(39)
    expect(layout.logoWidthPercent).toBe(20)
    expect(layout.qrWidthPercent).toBe(38)
    expect(layout.logoWidthMm).toBeCloseTo(layout.innerRowMm * 0.2, 5)
    expect(layout.qrWidthMm).toBeCloseTo(layout.innerRowMm * 0.38, 5)
    expect(layout.gapCount).toBe(2)
    expect(layout.centerWidthMm).toBeCloseTo(
      layout.innerRowMm - layout.logoWidthMm - layout.qrWidthMm - layout.gapMm * 2,
      5,
    )
  })

  it('should reserve only center column when no side columns', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: false,
      hasQr: false,
    })

    expect(layout.logoWidthPercent).toBe(0)
    expect(layout.qrWidthPercent).toBe(0)
    expect(layout.centerWidthMm).toBe(39)
  })

  it('should scale down side columns when they would leave less than minimum center width', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 45,
      qrColumnWidthPercent: 50,
    })

    expect(layout.logoWidthPercent + layout.qrWidthPercent).toBeLessThanOrEqual(100 - MIN_CENTER_COLUMN_PERCENT)
    expect(layout.centerWidthMm).toBeGreaterThanOrEqual(layout.innerRowMm * (MIN_CENTER_COLUMN_PERCENT / 100))
  })
})
