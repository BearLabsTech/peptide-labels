import { describe, it, expect } from 'vitest'
import { mmToPx, parsePositiveMm, previewBaseWidthPx, pxToMm, resolvePixelSize } from './dimensions'
import { SKIP_DEFAULT_TARGET } from './defaults'

describe('dimensions', () => {
  it('should parse only positive finite custom dimensions', () => {
    expect(parsePositiveMm('40.5')).toBe(40.5)
    expect(parsePositiveMm('0')).toBeNull()
    expect(parsePositiveMm('-1')).toBeNull()
    expect(parsePositiveMm('Infinity')).toBeNull()
    expect(parsePositiveMm('40mm')).toBeNull()
    expect(parsePositiveMm('')).toBeNull()
  })

  it('should convert 40x20 mm at 300 DPI to 472x236 pixels', () => {
    expect(mmToPx(40, 300)).toBe(472)
    expect(mmToPx(20, 300)).toBe(236)
    expect(resolvePixelSize(40, 20, 300)).toEqual({ widthPx: 472, heightPx: 236 })
  })

  it('should convert 40x20 mm at 203 DPI to 320x160 pixels', () => {
    expect(resolvePixelSize(40, 20, 203)).toEqual({ widthPx: 320, heightPx: 160 })
  })

  it('should convert 50x30 mm at 300 DPI to 591x354 pixels', () => {
    expect(resolvePixelSize(50, 30, 300)).toEqual({ widthPx: 591, heightPx: 354 })
  })

  it('should convert pixels back to mm at the same DPI', () => {
    // Exact inverse of the px formula (mmToPx rounds; do not round-trip rounded px).
    expect(pxToMm(300, 300)).toBeCloseTo(25.4, 10)
    expect(pxToMm(150, 300)).toBeCloseTo(12.7, 10)
  })

  it('should use preview base width equal to export width at pixelRatio 1', () => {
    expect(previewBaseWidthPx(SKIP_DEFAULT_TARGET)).toBe(472)
  })
})
