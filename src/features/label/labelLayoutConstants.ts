/** Reference 40 × 20 mm stock — cap body/title search at 26 px export pixels. */
export const REF_LABEL_HEIGHT_MM = 20
export const REF_MAX_FONT_SIZE_PX = 26

/** Fraction of inner label height reserved for compound title when body sections print. */
export const TITLE_HEIGHT_WEIGHT = 0.5
export const TITLE_HEIGHT_WEIGHT_DANGER = 0.42
/**
 * Title height share when body sections are present (non-danger).
 * Caps `TITLE_HEIGHT_WEIGHT + 0.06` so title and body both get usable vertical room.
 */
export const TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55

/** Danger-mode body font is scaled down relative to the fitted body size. */
export const DANGER_BODY_FONT_SCALE = 0.8

/** Title font should stay at least this multiple of body font when both print. */
export const MIN_TITLE_TO_BODY_FONT_RATIO = 1.35

/** Minimum font size for title/body search loops (export pixels). */
export const MIN_FONT_SIZE_PX = 8

/**
 * Bold uppercase title line-height as a fraction of font size
 * (matches `.label-preview-title` in LabelPreview.css). Distinct from glyph-width 0.95.
 */
export const TITLE_LINE_HEIGHT_EM = 0.95

/** Gap between title band and main row in identity-header layout (`.label-preview-container--identity-header`). */
export const IDENTITY_HEADER_TITLE_BAND_GAP_FRAC = 0.75

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

/** Testing column (COA QR + test indicators) — right flex child (`LabelPreview.css`). */
export const QR_COLUMN_WIDTH = {
  defaultPercent: 38,
  minPercent: 25,
  maxPercent: 50,
} as const satisfies ColumnWidthBounds

/** Minimum center column share of the flex row (text must stay readable). */
export const MIN_CENTER_COLUMN_PERCENT = 15

export function maxFontSizePxForLabelHeight(heightMm: number): number {
  return Math.round(REF_MAX_FONT_SIZE_PX * (heightMm / REF_LABEL_HEIGHT_MM))
}

export function clampColumnWidthPercent(
  percent: number | undefined,
  bounds: ColumnWidthBounds,
): number {
  const pct = percent ?? bounds.defaultPercent
  return Math.min(bounds.maxPercent, Math.max(bounds.minPercent, pct))
}
