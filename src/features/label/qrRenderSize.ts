import { IDENTITY_HEADER_TITLE_BAND_GAP_FRAC, TITLE_LINE_HEIGHT_EM } from './labelLayoutConstants'
import { testIndicatorsStackHeightPx, type TestIndicatorLayout } from './testIndicatorLayout'
import { mmToPx } from './print/dimensions'
import type { PrintTarget } from './print/types'

/**
 * Narrow input for QR sizing — only the counts and geometry fields that affect size.
 * Passing whole arrays was an `unknown[]` workaround; lengths are what we need.
 */
export interface QrRenderSizeInput {
  qrColumnWidthPercent: number
  qrCodeCount: number
  testIndicatorCount: number
  testIndicatorLayout?: TestIndicatorLayout
  titleLines: readonly string[]
  titleFontSizePx: number
}

/** @deprecated Use {@link QrRenderSizeInput}. */
export type QrRenderLayoutModel = QrRenderSizeInput

/** Vertical gap between test indicators and QR when they share the testing column. */
export const TEST_QR_GAP_FRAC = 0.025

/** Usable fraction of testing-column width after inner padding / thermal rounding. */
export const QR_WIDTH_SAFETY = 0.88

/** Inner width of the testing column as export pixels (matches layout engine padding trim). */
function testingColumnInnerPx(model: QrRenderSizeInput, baseWidthPx: number): number {
  return Math.floor(baseWidthPx * (model.qrColumnWidthPercent / 100) * QR_WIDTH_SAFETY)
}

/** Vertical budget for the three-column row (identity header subtracts title band). */
function rowInnerHeightPx(model: QrRenderSizeInput, printTarget: PrintTarget): number {
  let innerPx = mmToPx(printTarget.labelHeightMm - printTarget.paddingMm * 2, printTarget.effectiveDpi)

  if (model.titleLines.length > 0) {
    const titlePx = model.titleLines.length * model.titleFontSizePx * TITLE_LINE_HEIGHT_EM
    const gapPx = mmToPx(printTarget.paddingMm, printTarget.effectiveDpi) * IDENTITY_HEADER_TITLE_BAND_GAP_FRAC
    innerPx = Math.max(0, innerPx - titlePx - gapPx)
  }

  return innerPx
}

/** Rendered indicator stack height — matches LabelPreview.css (label line-height 1.1). */
export function indicatorsStackHeightPx(model: QrRenderSizeInput): number {
  const layout = model.testIndicatorLayout
  if (!layout || model.testIndicatorCount === 0) return 0
  return testIndicatorsStackHeightPx(layout, model.testIndicatorCount)
}

export function testQrGapPx(baseWidthPx: number): number {
  return Math.round(baseWidthPx * TEST_QR_GAP_FRAC)
}

/** Matches `.qr-text` in LabelPreview.css (2cqw font, 0.2cqw top margin, line-height 1). */
export const QR_CAPTION_FONT_FRAC = 0.02
export const QR_CAPTION_MARGIN_TOP_FRAC = 0.002
export const QR_CAPTION_LINE_HEIGHT = 1

export function qrCaptionHeightPx(baseWidthPx: number): number {
  const fontPx = baseWidthPx * QR_CAPTION_FONT_FRAC
  const marginPx = baseWidthPx * QR_CAPTION_MARGIN_TOP_FRAC
  // +1px buffer for subpixel rounding when preview width differs from export base width.
  return Math.ceil(marginPx + fontPx * QR_CAPTION_LINE_HEIGHT) + 1
}

/** QR `size` prop — must fit testing column width and space below indicators. */
export function computeQrRenderSizePx(
  model: QrRenderSizeInput,
  printTarget: PrintTarget,
  baseWidthPx: number,
): number {
  const maxByWidthPx = testingColumnInnerPx(model, baseWidthPx)
  const rowHeightPx = rowInnerHeightPx(model, printTarget)
  const captionPx = model.qrCodeCount > 0 ? qrCaptionHeightPx(baseWidthPx) : 0

  if (model.testIndicatorCount === 0 || !model.testIndicatorLayout) {
    return Math.max(16, Math.min(maxByWidthPx, rowHeightPx - captionPx))
  }

  const gapPx = testQrGapPx(baseWidthPx)
  const indicatorsPx = indicatorsStackHeightPx(model)
  const maxQrForStackPx = rowHeightPx - indicatorsPx - gapPx - captionPx
  return Math.max(16, Math.min(maxByWidthPx, maxQrForStackPx))
}
