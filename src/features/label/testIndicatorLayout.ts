import { mmToPx, pxToMm } from '../../print/dimensions'

export interface TestIndicatorLayout {
  readonly markSizePx: number
  readonly labelFontSizePx: number
  readonly rowGapPx: number
  readonly labelMarkGapPx: number
}

export interface TestIndicatorLayoutInput {
  readonly effectiveDpi: number
  readonly labelHeightMm: number
  readonly paddingMm: number
  readonly qrColumnWidthMm: number
  readonly rowCount: number
  /** When true, QR codes share the testing column (reduces indicator height budget). */
  readonly qrSharesColumn: boolean
  /** Override vertical budget for indicators; defaults to full inner label height. */
  readonly indicatorsHeightMm?: number
  /** Full label strings that must fit within the column width. */
  readonly labels: readonly string[]
}

/** Arial 800 caps — conservative so wide words like "Heavy Metals" fit. */
const LABEL_CHAR_WIDTH_EM = 0.62
const WIDTH_SAFETY = 0.97
const ABS_MIN_LABEL_FONT_MM = 0.95
const MAX_LABEL_FONT_MM = 2.6
/** Mark height target relative to label cap height. */
const MARK_TO_LABEL_RATIO = 1.85
/** Mark width cap as fraction of column inner width — leave margin so marks do not bleed. */
const MARK_WIDTH_FRAC = 0.82
/** Padding trim inside the testing column (distinct from danger-title / CSS pad multipliers). */
const TEST_INDICATOR_COLUMN_PAD_FRAC = 0.65

/** Matches `.label-test-name` line-height in LabelPreview.css. */
export const TEST_LABEL_LINE_HEIGHT = 1.1

export function testIndicatorsStackHeightPx(layout: TestIndicatorLayout, rowCount: number): number {
  if (rowCount <= 0) return 0
  const labelLinePx = layout.labelFontSizePx * TEST_LABEL_LINE_HEIGHT
  const rowPx = labelLinePx + layout.labelMarkGapPx + layout.markSizePx
  return rowCount * rowPx + Math.max(0, rowCount - 1) * layout.rowGapPx
}

export function estimateTestLabelWidthMm(label: string, fontSizeMm: number): number {
  if (!label) return 0
  return label.length * fontSizeMm * LABEL_CHAR_WIDTH_EM
}

/**
 * Size test marks from physical label geometry.
 * Labels always print in full; marks scale to fill remaining row space.
 */
export function computeTestIndicatorLayout(input: TestIndicatorLayoutInput): TestIndicatorLayout | null {
  if (input.rowCount <= 0) return null

  const usableHeightMm = input.indicatorsHeightMm ?? (input.labelHeightMm - input.paddingMm * 2)
  let indicatorsHeightMm = usableHeightMm
  if (input.qrSharesColumn) {
    indicatorsHeightMm *= 0.45
  }

  const rowGapMm = 0.18
  const labelMarkGapMm = 0.08
  const totalGapMm = rowGapMm * Math.max(0, input.rowCount - 1)
  const rowHeightMm = Math.max(0, (indicatorsHeightMm - totalGapMm) / input.rowCount)
  if (rowHeightMm <= 0) return null

  // Column element width minus reduced inner left padding (`.label-right-column`).
  const columnInnerMm = Math.max(0, (input.qrColumnWidthMm - input.paddingMm * TEST_INDICATOR_COLUMN_PAD_FRAC) * WIDTH_SAFETY)
  const longestLabel = input.labels.reduce((longest, label) => (label.length > longest.length ? label : longest), '')
  const maxLabelFontForWidthMm = longestLabel.length > 0
    ? columnInnerMm / (longestLabel.length * LABEL_CHAR_WIDTH_EM)
    : MAX_LABEL_FONT_MM

  const maxLabelForMarkRatioMm = (rowHeightMm - labelMarkGapMm) / (TEST_LABEL_LINE_HEIGHT + MARK_TO_LABEL_RATIO)
  let resolvedLabelFontMm = Math.min(maxLabelFontForWidthMm, maxLabelForMarkRatioMm, MAX_LABEL_FONT_MM)
  resolvedLabelFontMm = Math.max(resolvedLabelFontMm, ABS_MIN_LABEL_FONT_MM)
  resolvedLabelFontMm = Math.min(resolvedLabelFontMm, maxLabelFontForWidthMm)

  let labelFontSizePx = Math.floor(mmToPx(resolvedLabelFontMm, input.effectiveDpi))
  while (
    labelFontSizePx > 1 &&
    estimateTestLabelWidthMm(longestLabel, labelFontSizePxToMm(labelFontSizePx, input.effectiveDpi)) > columnInnerMm
  ) {
    labelFontSizePx -= 1
  }
  resolvedLabelFontMm = labelFontSizePxToMm(labelFontSizePx, input.effectiveDpi)

  const markFromRowMm = rowHeightMm - resolvedLabelFontMm * TEST_LABEL_LINE_HEIGHT - labelMarkGapMm
  const markFromWidthMm = columnInnerMm * MARK_WIDTH_FRAC
  const markSizeMm = Math.min(markFromRowMm, markFromWidthMm)

  if (markSizeMm <= 0) return null

  let layout: TestIndicatorLayout = {
    markSizePx: mmToPx(markSizeMm, input.effectiveDpi),
    labelFontSizePx,
    rowGapPx: mmToPx(rowGapMm, input.effectiveDpi),
    labelMarkGapPx: mmToPx(labelMarkGapMm, input.effectiveDpi),
  }

  const budgetPx = mmToPx(indicatorsHeightMm, input.effectiveDpi)
  while (testIndicatorsStackHeightPx(layout, input.rowCount) > budgetPx && layout.markSizePx > 8) {
    layout = { ...layout, markSizePx: layout.markSizePx - 1 }
  }
  while (testIndicatorsStackHeightPx(layout, input.rowCount) > budgetPx && layout.labelFontSizePx > 1) {
    layout = { ...layout, labelFontSizePx: layout.labelFontSizePx - 1 }
  }

  return layout
}

/** Convert export px back to mm for layout assertions. */
export function labelFontSizePxToMm(fontSizePx: number, effectiveDpi: number): number {
  return pxToMm(fontSizePx, effectiveDpi)
}
