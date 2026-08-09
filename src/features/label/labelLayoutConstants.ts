import { mmToPx } from '../../print/dimensions'

/**
 * LabelLayoutEngine constructor fallback when callers do not pass an explicit
 * ceiling (ad-hoc construction, some tests). Production always computes a
 * real ceiling via {@link maxFontSizePxForLabelHeight}.
 */
export const REF_MAX_FONT_SIZE_PX = 26

/** Fraction of inner label height reserved for compound title in danger mode. */
export const TITLE_HEIGHT_WEIGHT_DANGER = 0.42
/** Title height share when body sections are present (non-danger). */
export const TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55

/**
 * Sparse danger (UNTESTED, no recon/protocol/source): DANGER banner share of
 * inner height. Leaves the rest for the demoted compound name and badges.
 */
export const SPARSE_DANGER_TITLE_HEIGHT_FRAC = 0.36
/**
 * Sparse danger: demoted compound share of inner height when tests/QR also
 * print below. When nothing is below, demoted uses the remainder after the
 * banner (see IdentityHeaderTemplate).
 */
export const SPARSE_DANGER_DEMOTED_HEIGHT_FRAC = 0.44

/** Danger-mode body font is scaled down relative to the fitted body size. */
export const DANGER_BODY_FONT_SCALE = 0.8

/** Title font should stay at least this multiple of body font when both print. */
export const MIN_TITLE_TO_BODY_FONT_RATIO = 1.35

/** Minimum font size for title/body search loops (export pixels). */
export const MIN_FONT_SIZE_PX = 8

/**
 * How reconstitution/protocol/source boxes are arranged under the title.
 * Chosen at fit time for the larger body font — see {@link TitleBodyFitter}.
 */
export type BodyBoxArrangement = 'stacked' | 'row'

/**
 * Arrangement candidates for a given body-box count. One box can only stack;
 * two or three try stacked then row (stacked first so equal-font ties keep it).
 */
export function bodyBoxArrangementCandidates(boxCount: number): readonly BodyBoxArrangement[] {
  if (boxCount <= 1) return ['stacked']
  return ['stacked', 'row']
}

/** Section cell width: full width when stacked; equal share when in a row. */
export function sectionWidthMm(
  widthMm: number,
  boxCount: number,
  arrangement: BodyBoxArrangement,
): number {
  if (arrangement === 'row' && boxCount > 0) return widthMm / boxCount
  return widthMm
}

/**
 * How many vertical rows of section boxes the body occupies.
 * A row arrangement is one visual row; stacked puts each box on its own row.
 * Used by body-box slack padding so leftover height is divided by visual rows.
 */
export function bodyBoxRowCount(boxCount: number, arrangement: BodyBoxArrangement): number {
  if (boxCount <= 0) return 0
  return arrangement === 'row' ? 1 : boxCount
}

export interface ColumnWidthBounds {
  readonly defaultPercent: number
  readonly minPercent: number
  readonly maxPercent: number
}

/** Logo column — left flex child (`LabelPreview.css`). */
export const LOGO_COLUMN_WIDTH = {
  defaultPercent: 20,
  minPercent: 15,
  maxPercent: 45,
} as const satisfies ColumnWidthBounds

/**
 * Logo share when the sticker has no body sections (sparse composition).
 * Wider than the dense default so the logo can grow when nothing else competes.
 */
export const SPARSE_LOGO_COLUMN_WIDTH = {
  defaultPercent: 24,
  minPercent: 18,
  maxPercent: 38,
} as const satisfies ColumnWidthBounds

/** Testing column (COA QR + test indicators) — right flex child (`LabelPreview.css`). */
export const QR_COLUMN_WIDTH = {
  defaultPercent: 38,
  minPercent: 25,
  maxPercent: 50,
} as const satisfies ColumnWidthBounds

/** Minimum center column share of the flex row (text must stay readable). */
export const MIN_CENTER_COLUMN_PERCENT = 15

/**
 * Structural ceiling for the font-size search: large enough that it is never
 * the real limit. No single line of text can usefully need to be taller than
 * the whole label, so the label's own height in export pixels is a safe,
 * always-generous starting point. The *real* limits are the width/height fit
 * checks already inside LabelLayoutEngine (doesFitHeight, longestLineFitsWidth,
 * sectionLabelsFitBoxWidth) — they already shrink correctly for dense content;
 * this ceiling just stops being the thing that (incorrectly) binds first.
 */
export function maxFontSizePxForLabelHeight(heightMm: number, dpi: number): number {
  return mmToPx(heightMm, dpi)
}

export function clampColumnWidthPercent(
  percent: number | undefined,
  bounds: ColumnWidthBounds,
): number {
  const pct = percent ?? bounds.defaultPercent
  return Math.min(bounds.maxPercent, Math.max(bounds.minPercent, pct))
}
