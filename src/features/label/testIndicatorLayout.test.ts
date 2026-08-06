import { describe, it, expect } from 'vitest'
import {
  computeTestIndicatorLayout,
  computeSoloTestIndicatorLayout,
  estimateTestLabelWidthMm,
  labelFontSizePxToMm,
  testIndicatorsStackHeightPx,
  testIndicatorsSoloRowHeightPx,
} from './testIndicatorLayout'
import { mmToPx } from '../../print/dimensions'

describe('computeTestIndicatorLayout', () => {
  const base = {
    effectiveDpi: 300,
    labelHeightMm: 20,
    paddingMm: 0.5,
    qrColumnWidthMm: 14,
    labels: ['Mass', 'Purity'],
  }

  it('should return larger marks when fewer tests print', () => {
    const one = computeTestIndicatorLayout({ ...base, rowCount: 1, qrSharesColumn: false })
    const three = computeTestIndicatorLayout({ ...base, rowCount: 3, qrSharesColumn: false })
    const seven = computeTestIndicatorLayout({ ...base, rowCount: 7, qrSharesColumn: false })

    expect(one!.markSizePx).toBeGreaterThan(three!.markSizePx)
    expect(three!.markSizePx).toBeGreaterThan(seven!.markSizePx)
  })

  it('should keep marks larger than label text', () => {
    const layout = computeTestIndicatorLayout({ ...base, rowCount: 2, qrSharesColumn: false })
    expect(layout!.markSizePx).toBeGreaterThan(layout!.labelFontSizePx * 1.5)
  })

  it('should fit Heavy Metals within a default-width testing column', () => {
    const innerRowMm = 39
    const qrColumnWidthMm = innerRowMm * 0.38
    const layout = computeTestIndicatorLayout({
      effectiveDpi: 300,
      labelHeightMm: 20,
      paddingMm: 0.5,
      qrColumnWidthMm,
      rowCount: 3,
      qrSharesColumn: false,
      labels: ['Mass', 'Purity', 'Heavy Metals'],
    })

    const columnInnerMm = Math.max(0, (qrColumnWidthMm - 0.5 * 0.65) * 0.97)
    const labelMm = labelFontSizePxToMm(layout!.labelFontSizePx, 300)
    expect(estimateTestLabelWidthMm('Heavy Metals', labelMm, 300)).toBeLessThanOrEqual(columnInnerMm)
  })

  it('should shrink label text to fit the longest word in a narrow column', () => {
    const narrow = computeTestIndicatorLayout({
      ...base,
      qrColumnWidthMm: 8,
      rowCount: 1,
      qrSharesColumn: false,
      labels: ['Heavy Metals'],
    })
    const wide = computeTestIndicatorLayout({
      ...base,
      qrColumnWidthMm: 16,
      rowCount: 1,
      qrSharesColumn: false,
      labels: ['Heavy Metals'],
    })

    expect(narrow!.labelFontSizePx).toBeLessThan(wide!.labelFontSizePx)
    expect(narrow!.labelFontSizePx).toBeGreaterThan(0)
  })

  it('should shrink available height when QR codes share the column', () => {
    const solo = computeTestIndicatorLayout({ ...base, rowCount: 2, qrSharesColumn: false })
    const shared = computeTestIndicatorLayout({ ...base, rowCount: 2, qrSharesColumn: true })
    expect(solo!.markSizePx).toBeGreaterThan(shared!.markSizePx)
  })

  it('should cap mark width within the testing column inner width', () => {
    const qrColumnWidthMm = 14
    const layout = computeTestIndicatorLayout({
      ...base,
      qrColumnWidthMm,
      rowCount: 2,
      qrSharesColumn: false,
      labels: ['Purity', 'Endotoxin'],
    })
    const columnInnerMm = Math.max(0, (qrColumnWidthMm - 0.5 * 0.65) * 0.97)
    const markMm = labelFontSizePxToMm(layout!.markSizePx, 300)
    expect(markMm).toBeLessThanOrEqual(columnInnerMm * 0.85)
  })

  it('should return undefined when there is nothing to print', () => {
    expect(computeTestIndicatorLayout({ ...base, rowCount: 0, qrSharesColumn: false })).toBeNull()
  })

  it('should fit rendered stack height within the indicators budget', () => {
    const indicatorsHeightMm = 8
    const layout = computeTestIndicatorLayout({
      ...base,
      rowCount: 2,
      qrSharesColumn: false,
      indicatorsHeightMm,
    })
    const budgetPx = mmToPx(indicatorsHeightMm, 300)
    expect(testIndicatorsStackHeightPx(layout!, 2)).toBeLessThanOrEqual(budgetPx)
  })
})

describe('computeSoloTestIndicatorLayout', () => {
  const base = {
    effectiveDpi: 300,
    availableWidthMm: 36,
    indicatorsHeightMm: 8,
    labels: ['Purity', 'Endotoxin'],
    titleFontSizePx: 48,
  }

  it('should return null when there is nothing to print', () => {
    expect(computeSoloTestIndicatorLayout({ ...base, rowCount: 0 })).toBeNull()
  })

  it('should shrink badge label text when more badges share the width', () => {
    const one = computeSoloTestIndicatorLayout({
      effectiveDpi: 300,
      availableWidthMm: 20,
      indicatorsHeightMm: 12,
      rowCount: 1,
      labels: ['Heavy Metals'],
      titleFontSizePx: 200,
    })
    const three = computeSoloTestIndicatorLayout({
      effectiveDpi: 300,
      availableWidthMm: 20,
      indicatorsHeightMm: 12,
      rowCount: 3,
      labels: ['Heavy Metals', 'Endotoxin', 'Sterility'],
      titleFontSizePx: 200,
    })
    expect(one!.labelFontSizePx).toBeGreaterThan(three!.labelFontSizePx)
  })

  it('should fit one badge row within the height budget', () => {
    const layout = computeSoloTestIndicatorLayout({
      ...base,
      rowCount: 2,
      indicatorsHeightMm: 7,
    })
    expect(testIndicatorsSoloRowHeightPx(layout!)).toBeLessThanOrEqual(mmToPx(7, 300))
  })

  it('should keep marks larger than label text', () => {
    const layout = computeSoloTestIndicatorLayout({ ...base, rowCount: 2 })
    expect(layout!.markSizePx).toBeGreaterThan(layout!.labelFontSizePx * 1.5)
  })

  it('should keep marks subordinate to the compound title', () => {
    const layout = computeSoloTestIndicatorLayout({
      ...base,
      rowCount: 1,
      labels: ['Purity'],
      indicatorsHeightMm: 20,
      titleFontSizePx: 40,
    })
    expect(layout!.markSizePx).toBeLessThanOrEqual(Math.floor(40 * 0.62))
    expect(layout!.labelFontSizePx).toBeLessThanOrEqual(Math.floor(40 * 0.38))
  })
})
