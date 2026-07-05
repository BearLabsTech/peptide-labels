/** Reference 40 × 20 mm stock — cap body/title search at 26 px export pixels. */
export const REF_LABEL_HEIGHT_MM = 20
export const REF_MAX_FONT_SIZE_PX = 26

export interface ColumnWidthBounds {
  defaultPercent: number
  minPercent: number
  maxPercent: number
}

/** Logo column — left flex child (`LabelPreview.css`). */
export const LOGO_COLUMN_WIDTH: ColumnWidthBounds = {
  defaultPercent: 20,
  minPercent: 15,
  maxPercent: 45,
}

/** Testing column (COA QR + test indicators) — right flex child (`LabelPreview.css`). */
export const QR_COLUMN_WIDTH: ColumnWidthBounds = {
  defaultPercent: 38,
  minPercent: 25,
  maxPercent: 50,
}

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
