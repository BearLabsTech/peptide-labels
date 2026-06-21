import { describe, it, expect } from 'vitest'
import { buildExportSpec } from './exportSpec'
import { resolvePrintTarget } from './PrintTargetResolver'
import { previewBaseWidthPx } from './dimensions'

describe('exportSpec', () => {
  it('should match skip default selection to 472x236 canvas at pixelRatio 1', () => {
    const spec = buildExportSpec(resolvePrintTarget({}))
    expect(spec).toEqual({
      canvasWidthPx: 472,
      canvasHeightPx: 236,
      pixelRatio: 1,
      dpi: 300,
    })
  })

  it('should match B21 explicit selection to 320x160 canvas', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-b21', labelId: '40x20' })
    expect(buildExportSpec(target)).toEqual({
      canvasWidthPx: 320,
      canvasHeightPx: 160,
      pixelRatio: 1,
      dpi: 203,
    })
  })

  it('should match M2 explicit selection to 472x236 canvas', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-m2', labelId: '40x20' })
    expect(buildExportSpec(target)).toEqual({
      canvasWidthPx: 472,
      canvasHeightPx: 236,
      pixelRatio: 1,
      dpi: 300,
    })
  })

  it('should match custom 50x30 without printer to 591x354 canvas', () => {
    const spec = buildExportSpec(resolvePrintTarget({ widthMm: 50, heightMm: 30 }))
    expect(spec.canvasWidthPx).toBe(591)
    expect(spec.canvasHeightPx).toBe(354)
    expect(spec.dpi).toBe(300)
  })

  it('should align preview base width with export canvas width', () => {
    const cases = [
      resolvePrintTarget({}),
      resolvePrintTarget({ printerId: 'niimbot-b21', labelId: '40x20' }),
      resolvePrintTarget({ widthMm: 50, heightMm: 30 }),
    ]
    for (const target of cases) {
      const spec = buildExportSpec(target)
      expect(previewBaseWidthPx(target)).toBe(spec.canvasWidthPx)
    }
  })
})
