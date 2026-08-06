import { mmToPx, pxToMm } from '../../print/dimensions'
import { HeuristicTextMeasurer } from './domain/HeuristicTextMeasurer'
import type { TextMeasurer } from './domain/ports'

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
  readonly measurer?: TextMeasurer
}

/** Inputs for the sparse (no-body) horizontal badge row. */
export interface SoloTestIndicatorLayoutInput {
  readonly effectiveDpi: number
  readonly availableWidthMm: number
  readonly rowCount: number
  /** Vertical budget for the single badge row; defaults to a generous share of width. */
  readonly indicatorsHeightMm: number
  readonly labels: readonly string[]
  /**
   * Title font size (export px). Marks stay subordinate to the compound name —
   * capped below this so a sparse badge row cannot visually dominate the title.
   */
  readonly titleFontSizePx: number
  readonly measurer?: TextMeasurer
}

/** Mark must stay clearly smaller than the compound title. */
const SOLO_MARK_TO_TITLE_RATIO = 0.62
/** Badge label text stays smaller than the mark, and well below the title. */
const SOLO_LABEL_TO_TITLE_RATIO = 0.38

const WIDTH_SAFETY = 0.97
const ABS_MIN_LABEL_FONT_MM = 0.95
const MAX_LABEL_FONT_MM = 2.6
/** Mark height target relative to label cap height. */
const MARK_TO_LABEL_RATIO = 1.85
/** Mark width cap as fraction of column/badge inner width — leave margin so marks do not bleed. */
const MARK_WIDTH_FRAC = 0.82
/** Padding trim inside the testing column (distinct from danger-title / CSS pad multipliers). */
const TEST_INDICATOR_COLUMN_PAD_FRAC = 0.65
/** Horizontal gap between badges in the sparse solo row, as a fraction of available width. */
const SOLO_BADGE_GAP_FRAC = 0.04
/** Font weight of `.label-test-name` (see LabelPreview.css). */
export const TEST_LABEL_FONT_WEIGHT = 800

/** Matches `.label-test-name` line-height in LabelPreview.css. */
export const TEST_LABEL_LINE_HEIGHT = 1.1

export function testIndicatorsStackHeightPx(layout: TestIndicatorLayout, rowCount: number): number {
  if (rowCount <= 0) return 0
  const labelLinePx = layout.labelFontSizePx * TEST_LABEL_LINE_HEIGHT
  const rowPx = labelLinePx + layout.labelMarkGapPx + layout.markSizePx
  return rowCount * rowPx + Math.max(0, rowCount - 1) * layout.rowGapPx
}

/** Height of one horizontal badge row (label above mark) — sparse solo layout. */
export function testIndicatorsSoloRowHeightPx(layout: TestIndicatorLayout): number {
  return layout.labelFontSizePx * TEST_LABEL_LINE_HEIGHT + layout.labelMarkGapPx + layout.markSizePx
}

/** Measured label width in mm (for assertions). Defaults to the heuristic measurer. */
export function estimateTestLabelWidthMm(
  label: string,
  fontSizeMm: number,
  effectiveDpi: number,
  measurer: TextMeasurer = new HeuristicTextMeasurer(),
): number {
  if (!label) return 0
  const fontPx = mmToPx(fontSizeMm, effectiveDpi)
  return pxToMm(
    measurer.measureWidthPx(label, fontPx, TEST_LABEL_FONT_WEIGHT),
    effectiveDpi,
  )
}

type SizedBadge = {
  readonly labelFontSizePx: number
  readonly markSizePx: number
  readonly labelMarkGapPx: number
  readonly rowGapPx: number
}

/**
 * Fit label font + mark into a single badge cell of known width and height.
 * Shared by the dense stacked column and the sparse horizontal row.
 */
function fitBadgeIntoCell(input: {
  readonly effectiveDpi: number
  readonly cellWidthMm: number
  readonly cellHeightMm: number
  readonly labels: readonly string[]
  readonly rowGapMm: number
  readonly labelMarkGapMm: number
  readonly measurer: TextMeasurer
}): SizedBadge | null {
  const { effectiveDpi, cellWidthMm, cellHeightMm, labels, rowGapMm, labelMarkGapMm, measurer } = input
  if (cellWidthMm <= 0 || cellHeightMm <= 0) return null

  const longestLabel = labels.reduce((longest, label) => (label.length > longest.length ? label : longest), '')
  const maxLabelForMarkRatioMm = (cellHeightMm - labelMarkGapMm) / (TEST_LABEL_LINE_HEIGHT + MARK_TO_LABEL_RATIO)
  let resolvedLabelFontMm = Math.min(maxLabelForMarkRatioMm, MAX_LABEL_FONT_MM)
  resolvedLabelFontMm = Math.max(resolvedLabelFontMm, ABS_MIN_LABEL_FONT_MM)

  let labelFontSizePx = Math.floor(mmToPx(resolvedLabelFontMm, effectiveDpi))
  const cellWidthPx = mmToPx(cellWidthMm, effectiveDpi)
  while (
    labelFontSizePx > 1 &&
    longestLabel.length > 0 &&
    measurer.measureWidthPx(longestLabel, labelFontSizePx, TEST_LABEL_FONT_WEIGHT) > cellWidthPx
  ) {
    labelFontSizePx -= 1
  }
  resolvedLabelFontMm = labelFontSizePxToMm(labelFontSizePx, effectiveDpi)

  const markFromRowMm = cellHeightMm - resolvedLabelFontMm * TEST_LABEL_LINE_HEIGHT - labelMarkGapMm
  const markFromWidthMm = cellWidthMm * MARK_WIDTH_FRAC
  const markSizeMm = Math.min(markFromRowMm, markFromWidthMm)
  if (markSizeMm <= 0) return null

  let layout: SizedBadge = {
    markSizePx: mmToPx(markSizeMm, effectiveDpi),
    labelFontSizePx,
    rowGapPx: mmToPx(rowGapMm, effectiveDpi),
    labelMarkGapPx: mmToPx(labelMarkGapMm, effectiveDpi),
  }

  const budgetPx = mmToPx(cellHeightMm, effectiveDpi)
  const stackHeight = (sized: SizedBadge) =>
    sized.labelFontSizePx * TEST_LABEL_LINE_HEIGHT + sized.labelMarkGapPx + sized.markSizePx

  while (stackHeight(layout) > budgetPx && layout.markSizePx > 8) {
    layout = { ...layout, markSizePx: layout.markSizePx - 1 }
  }
  while (stackHeight(layout) > budgetPx && layout.labelFontSizePx > 1) {
    layout = { ...layout, labelFontSizePx: layout.labelFontSizePx - 1 }
  }

  return layout
}

/**
 * Size test marks from physical label geometry (dense stacked column).
 * Labels always print in full; marks scale to fill remaining row space.
 */
export function computeTestIndicatorLayout(input: TestIndicatorLayoutInput): TestIndicatorLayout | null {
  if (input.rowCount <= 0) return null
  const measurer = input.measurer ?? new HeuristicTextMeasurer()

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

  const sized = fitBadgeIntoCell({
    effectiveDpi: input.effectiveDpi,
    cellWidthMm: columnInnerMm,
    cellHeightMm: rowHeightMm,
    labels: input.labels,
    rowGapMm,
    labelMarkGapMm,
    measurer,
  })
  if (!sized) return null

  let layout: TestIndicatorLayout = { ...sized }

  const budgetPx = mmToPx(indicatorsHeightMm, input.effectiveDpi)
  while (testIndicatorsStackHeightPx(layout, input.rowCount) > budgetPx && layout.markSizePx > 8) {
    layout = { ...layout, markSizePx: layout.markSizePx - 1 }
  }
  while (testIndicatorsStackHeightPx(layout, input.rowCount) > budgetPx && layout.labelFontSizePx > 1) {
    layout = { ...layout, labelFontSizePx: layout.labelFontSizePx - 1 }
  }

  return layout
}

/**
 * Size test marks for the sparse (no-body) horizontal badge row.
 * Available width is split evenly across badges; ratio caps keep marks
 * subordinate to the compound title.
 */
export function computeSoloTestIndicatorLayout(
  input: SoloTestIndicatorLayoutInput,
): TestIndicatorLayout | null {
  if (input.rowCount <= 0) return null
  const measurer = input.measurer ?? new HeuristicTextMeasurer()

  const labelMarkGapMm = 0.08
  const totalGapMm = input.availableWidthMm * SOLO_BADGE_GAP_FRAC * Math.max(0, input.rowCount - 1)
  const badgeWidthMm = Math.max(
    0,
    ((input.availableWidthMm * WIDTH_SAFETY) - totalGapMm) / input.rowCount,
  )
  if (badgeWidthMm <= 0 || input.indicatorsHeightMm <= 0) return null

  const gapMm = input.rowCount > 1
    ? (input.availableWidthMm * SOLO_BADGE_GAP_FRAC)
    : 0.18

  // Height budget is leftover space below the title (already reserved by the
  // caller). Ratio caps below keep marks subordinate — do not pre-shrink the
  // cell height against the title font size, or marks collapse to near-zero.
  const sized = fitBadgeIntoCell({
    effectiveDpi: input.effectiveDpi,
    cellWidthMm: badgeWidthMm,
    cellHeightMm: input.indicatorsHeightMm,
    labels: input.labels,
    rowGapMm: gapMm,
    labelMarkGapMm,
    measurer,
  })
  if (!sized) return null

  const maxMarkPx = Math.max(8, Math.floor(input.titleFontSizePx * SOLO_MARK_TO_TITLE_RATIO))
  const maxLabelPx = Math.max(1, Math.floor(input.titleFontSizePx * SOLO_LABEL_TO_TITLE_RATIO))
  return {
    ...sized,
    markSizePx: Math.min(sized.markSizePx, maxMarkPx),
    labelFontSizePx: Math.min(sized.labelFontSizePx, maxLabelPx),
  }
}

/** Convert export px back to mm for layout assertions. */
export function labelFontSizePxToMm(fontSizePx: number, effectiveDpi: number): number {
  return pxToMm(fontSizePx, effectiveDpi)
}
