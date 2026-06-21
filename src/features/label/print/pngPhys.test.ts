import { describe, it, expect } from 'vitest'
import { dpiToPixelsPerMeter, injectPngPhys, parsePngPhysPixelsPerMeter } from './pngPhys'

/** Minimal valid 1×1 PNG (IHDR + IDAT + IEND). */
function minimal1x1Png(): Uint8Array {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

describe('pngPhys', () => {
  it('should convert 300 DPI to pixels per meter', () => {
    expect(dpiToPixelsPerMeter(300)).toBe(11811)
  })

  it('should inject pHYs chunk declaring 300 DPI', () => {
    const png = minimal1x1Png()
    const out = injectPngPhys(png, 300)
    expect(out.length).toBeGreaterThan(png.length)
    expect(parsePngPhysPixelsPerMeter(out)).toBe(dpiToPixelsPerMeter(300))
  })

  it('should replace existing pHYs when injecting again', () => {
    const png = injectPngPhys(minimal1x1Png(), 203)
    const out = injectPngPhys(png, 300)
    expect(parsePngPhysPixelsPerMeter(out)).toBe(dpiToPixelsPerMeter(300))
  })
})
