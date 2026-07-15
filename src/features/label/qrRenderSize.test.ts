import { describe, it, expect } from 'vitest'
import {
  computeQrRenderSizePx,
  indicatorsStackHeightPx,
  qrCaptionHeightPx,
  testQrGapPx,
  type QrRenderLayoutModel,
} from './qrRenderSize'
import { resolvePrintTarget } from './print/PrintTargetResolver'
import { previewBaseWidthPx, mmToPx } from './print/dimensions'

describe('computeQrRenderSizePx', () => {
  it('should size QR to testing column width not full label width', () => {
    const printTarget = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
    const baseWidthPx = previewBaseWidthPx(printTarget)
    const model = {
      qrColumnWidthPercent: 38,
      testIndicators: [],
      titleLines: ['TIRZEPATIDE', '20MG'],
      titleFontSizePx: 20,
    } satisfies QrRenderLayoutModel

    const qrPx = computeQrRenderSizePx(model, printTarget, baseWidthPx)
    expect(qrPx).toBeLessThan(baseWidthPx)
    expect(qrPx).toBeLessThanOrEqual(Math.floor(baseWidthPx * 0.38 * 0.88))
  })

  it('should leave vertical room below test indicators when QR shares the column', () => {
    const printTarget = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
    const baseWidthPx = previewBaseWidthPx(printTarget)
    const model = {
      qrColumnWidthPercent: 38,
      qrCodes: [{ type: 'Vendor COA', url: 'https://example.com' }],
      testIndicators: [{ type: 'Purity' as const }, { type: 'Endotoxin' as const }],
      testIndicatorLayout: {
        markSizePx: 40,
        labelFontSizePx: 12,
        rowGapPx: 4,
        labelMarkGapPx: 2,
      },
      titleLines: ['TEST COMPOUND', '20MG'],
      titleFontSizePx: 14,
    } satisfies QrRenderLayoutModel

    const qrPx = computeQrRenderSizePx(model, printTarget, baseWidthPx)
    const stackPx = indicatorsStackHeightPx(model)
    const gapPx = testQrGapPx(baseWidthPx)
    const captionPx = qrCaptionHeightPx(baseWidthPx)
    const rowPx = mmToPx(printTarget.labelHeightMm - printTarget.paddingMm * 2, printTarget.effectiveDpi)

    expect(qrPx).toBeGreaterThan(0)
    expect(qrPx).toBeLessThan(baseWidthPx * 0.5)
    expect(stackPx + gapPx + qrPx + captionPx).toBeLessThanOrEqual(rowPx)
  })

  it('should budget QR caption height to match css', () => {
    const baseWidthPx = 472
    expect(qrCaptionHeightPx(baseWidthPx)).toBeGreaterThanOrEqual(
      Math.ceil(baseWidthPx * (0.002 + 0.02)),
    )
  })
})
