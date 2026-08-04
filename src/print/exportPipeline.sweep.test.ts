import { describe, expect, it } from 'vitest'
import { MM_PER_INCH, mmToPx, previewBaseWidthPx, pxToMm } from './dimensions'
import { buildExportSpec } from './exportSpec'
import { applyMonochromeThreshold } from './monochrome'
import { dpiToPixelsPerMeter, injectPngPhys, parsePngPhysPixelsPerMeter } from './pngPhys'
import { resolvePrintTarget } from './PrintTargetResolver'
import type { PrintTarget } from './types'

/** Catalog stocks × the two real printer DPIs (B21 203, default/M2 300). */
const CATALOG_TARGETS: readonly PrintTarget[] = [
  resolvePrintTarget({ printerId: 'niimbot-b21', stockId: '40x20-rounded' }),
  resolvePrintTarget({ printerId: 'niimbot-b21', stockId: '40x30-rounded' }),
  resolvePrintTarget({ printerId: 'niimbot-b21', stockId: '50x30-rounded' }),
  resolvePrintTarget({ stockId: '40x20-rounded' }),
  resolvePrintTarget({ stockId: '40x30-rounded' }),
  resolvePrintTarget({ stockId: '50x30-rounded' }),
]

const CATALOG_SIZES_MM = [
  { widthMm: 40, heightMm: 20 },
  { widthMm: 40, heightMm: 30 },
  { widthMm: 50, heightMm: 30 },
] as const

const REAL_DPIS = [203, 300] as const

/** Minimal valid 1×1 PNG (IHDR + IDAT + IEND). */
function minimal1x1Png(): Uint8Array {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function rgba(r: number, g: number, b: number, a: number): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a])
}

describe('export pipeline sweep', () => {
  it('should keep mmToPx and ExportSpec dimensions as integers for every catalog target', () => {
    for (const target of CATALOG_TARGETS) {
      const spec = buildExportSpec(target)
      expect(Number.isInteger(mmToPx(target.labelWidthMm, target.effectiveDpi))).toBe(true)
      expect(Number.isInteger(mmToPx(target.labelHeightMm, target.effectiveDpi))).toBe(true)
      expect(Number.isInteger(spec.canvasWidthPx)).toBe(true)
      expect(Number.isInteger(spec.canvasHeightPx)).toBe(true)
    }
  })

  it('should keep buildExportSpec pixelRatio at 1 and pass effectiveDpi through', () => {
    for (const target of CATALOG_TARGETS) {
      const spec = buildExportSpec(target)
      expect(spec.pixelRatio).toBe(1)
      expect(spec.dpi).toBe(target.effectiveDpi)
    }
  })

  it('should align previewBaseWidthPx with export canvas width for every catalog target', () => {
    for (const target of CATALOG_TARGETS) {
      expect(previewBaseWidthPx(target)).toBe(buildExportSpec(target).canvasWidthPx)
    }
  })

  it('should bound the mm↔px round trip within half a pixel for every positive real DPI', () => {
    for (const { widthMm, heightMm } of CATALOG_SIZES_MM) {
      for (const dpi of REAL_DPIS) {
        const bound = MM_PER_INCH / (2 * dpi)
        expect(Math.abs(pxToMm(mmToPx(widthMm, dpi), dpi) - widthMm)).toBeLessThanOrEqual(bound)
        expect(Math.abs(pxToMm(mmToPx(heightMm, dpi), dpi) - heightMm)).toBeLessThanOrEqual(bound)
      }
    }
  })

  it('should pin mmToPx degenerate DPI behavior without throwing', () => {
    // Left alone on purpose: these inputs never reach production callers.
    expect(mmToPx(40, 0)).toBe(0)
    expect(mmToPx(40, -1)).toBe(-2)
    expect(mmToPx(40, 0.5)).toBe(1)
    expect(Number.isNaN(mmToPx(40, Number.NaN))).toBe(true)
    expect(mmToPx(40, Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })

  it('should throw from pxToMm when dpi is not positive and finite', () => {
    for (const dpi of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY] as const) {
      expect(() => pxToMm(100, dpi)).toThrow(/positive finite dpi/)
    }
    // 0.5 is positive and finite, so it is allowed (unused in production).
    expect(pxToMm(1, 0.5)).toBeCloseTo(50.8, 10)
  })

  it('should force every monochrome output channel to {0,255} with opaque alpha', () => {
    const samples = [
      rgba(0, 0, 0, 255),
      rgba(255, 255, 255, 255),
      rgba(128, 128, 128, 255),
      rgba(200, 200, 200, 255), // brightness exactly 200 → black (threshold is > 200)
      rgba(201, 201, 201, 255), // just above → white
      rgba(0, 0, 0, 127), // alpha === 127 → white regardless of RGB
      rgba(0, 0, 0, 128), // alpha === 128 → keep brightness path (black)
      rgba(50, 50, 50, 0),
    ]
    for (const data of samples) {
      applyMonochromeThreshold(data)
      for (let i = 0; i < data.length; i += 4) {
        expect([0, 255]).toContain(data[i])
        expect([0, 255]).toContain(data[i + 1])
        expect([0, 255]).toContain(data[i + 2])
        expect(data[i + 3]).toBe(255)
        expect(data[i]).toBe(data[i + 1])
        expect(data[i + 1]).toBe(data[i + 2])
      }
    }
  })

  it('should pin monochrome brightness and alpha boundaries', () => {
    const atThreshold = rgba(200, 200, 200, 255)
    applyMonochromeThreshold(atThreshold)
    expect(Array.from(atThreshold)).toEqual([0, 0, 0, 255])

    const aboveThreshold = rgba(201, 201, 201, 255)
    applyMonochromeThreshold(aboveThreshold)
    expect(Array.from(aboveThreshold)).toEqual([255, 255, 255, 255])

    const lowAlpha = rgba(0, 0, 0, 127)
    applyMonochromeThreshold(lowAlpha)
    expect(Array.from(lowAlpha)).toEqual([255, 255, 255, 255])
  })

  it('should leave monochrome output unchanged when applied twice', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 255, 240, 240, 240, 200, 0, 0, 0, 100])
    applyMonochromeThreshold(data)
    const once = Array.from(data)
    applyMonochromeThreshold(data)
    expect(Array.from(data)).toEqual(once)
  })

  it('should throw when applyMonochromeThreshold receives a partial pixel', () => {
    expect(() => applyMonochromeThreshold(new Uint8ClampedArray(6))).toThrow(/whole number of RGBA pixels/)
  })

  it('should round-trip pHYs DPI through inject and parse for real DPIs', () => {
    const png = minimal1x1Png()
    for (const dpi of REAL_DPIS) {
      const injected = injectPngPhys(png, dpi)
      expect(parsePngPhysPixelsPerMeter(injected)).toBe(dpiToPixelsPerMeter(dpi))
      const again = injectPngPhys(injected, dpi)
      expect(again.length).toBe(injected.length)
      expect(parsePngPhysPixelsPerMeter(again)).toBe(dpiToPixelsPerMeter(dpi))
    }
  })

  it('should return short or non-IHDR bytes unchanged from injectPngPhys', () => {
    const short = new Uint8Array(10)
    expect(injectPngPhys(short, 300)).toBe(short)
    const noIhdr = new Uint8Array(32)
    noIhdr.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    // length + type "XXXX" where type is not IHDR
    noIhdr.set([0x00, 0x00, 0x00, 0x0d, 0x58, 0x58, 0x58, 0x58], 8)
    expect(injectPngPhys(noIhdr, 300)).toBe(noIhdr)
  })

  it('should return null from parsePngPhysPixelsPerMeter when a pHYs chunk is truncated', () => {
    // Signature + declared length 9 + type pHYs + only 2 payload bytes (needs 9+CRC).
    const bytes = new Uint8Array(18)
    const view = new DataView(bytes.buffer)
    view.setUint32(8, 9, false)
    bytes.set([0x70, 0x48, 0x59, 0x73], 12)
    expect(parsePngPhysPixelsPerMeter(bytes)).toBeNull()
  })

})
