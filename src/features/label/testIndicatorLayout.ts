import { mmToPx } from './print/dimensions'

export interface TestIndicatorLayout {
  markSizePx: number
  labelFontSizePx: number
  rowGapPx: number
  labelMarkGapPx: number
}

export interface TestIndicatorLayoutInput {
  effectiveDpi: number
  labelHeightMm: number
  paddingMm: number
  qrColumnWidthMm: number
  rowCount: number
  qrCodesAbove: boolean
  /** Full label strings that must fit within the column width. */
  labels: string[]
}

/** Arial 800 caps — conservative so wide words like "Heavy Metals" fit. */
const LABEL_CHAR_WIDTH_EM = 0.62
const WIDTH_SAFETY = 0.97
const ABS_MIN_LABEL_FONT_MM = 0.95
const MAX_LABEL_FONT_MM = 2.6
/** Mark height target relative to label cap height. */
const MARK_TO_LABEL_RATIO = 1.85
const MARK_WIDTH_FRAC = 0.97

export function estimateTestLabelWidthMm(label: string, fontSizeMm: number): number {
  if (!label) return 0
  return label.length * fontSizeMm * LABEL_CHAR_WIDTH_EM
}

/**
 * Size test marks from physical label geometry.
 * Labels always print in full; marks scale to fill remaining row space.
 */
export function computeTestIndicatorLayout(input: TestIndicatorLayoutInput): TestIndicatorLayout | undefined {
  if (input.rowCount <= 0) return undefined

  const usableHeightMm = input.labelHeightMm - input.paddingMm * 2
  let indicatorsHeightMm = usableHeightMm
  if (input.qrCodesAbove) {
    indicatorsHeightMm *= 0.45
  }

  const rowGapMm = 0.18
  const labelMarkGapMm = 0.08
  const totalGapMm = rowGapMm * Math.max(0, input.rowCount - 1)
  const rowHeightMm = Math.max(0, (indicatorsHeightMm - totalGapMm) / input.rowCount)
  if (rowHeightMm <= 0) return undefined

  // Column element width minus reduced inner left padding (`.label-right-column`).
  const columnInnerMm = Math.max(0, (input.qrColumnWidthMm - input.paddingMm * 0.65) * WIDTH_SAFETY)
  const longestLabel = input.labels.reduce((longest, label) => (label.length > longest.length ? label : longest), '')
  const maxLabelFontForWidthMm = longestLabel.length > 0
    ? columnInnerMm / (longestLabel.length * LABEL_CHAR_WIDTH_EM)
    : MAX_LABEL_FONT_MM

  const maxLabelForMarkRatioMm = (rowHeightMm - labelMarkGapMm) / (1 + MARK_TO_LABEL_RATIO)
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

  const markFromRowMm = rowHeightMm - resolvedLabelFontMm - labelMarkGapMm
  const markFromWidthMm = columnInnerMm * MARK_WIDTH_FRAC
  const markSizeMm = Math.min(markFromRowMm, markFromWidthMm)

  if (markSizeMm <= 0) return undefined

  return {
    markSizePx: mmToPx(markSizeMm, input.effectiveDpi),
    labelFontSizePx,
    rowGapPx: mmToPx(rowGapMm, input.effectiveDpi),
    labelMarkGapPx: mmToPx(labelMarkGapMm, input.effectiveDpi),
  }
}

/** Convert export px back to mm for layout assertions. */
export function labelFontSizePxToMm(fontSizePx: number, effectiveDpi: number): number {
  return (fontSizePx * 25.4) / effectiveDpi
}
