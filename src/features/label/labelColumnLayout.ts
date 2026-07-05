import {
  clampColumnWidthPercent,
  LOGO_COLUMN_WIDTH,
  MIN_CENTER_COLUMN_PERCENT,
  QR_COLUMN_WIDTH,
} from './labelLayoutConstants'

export interface ColumnLayoutInput {
  labelWidthMm: number
  paddingMm: number
  hasLogo: boolean
  hasQr: boolean
  logoColumnWidthPercent?: number
  qrColumnWidthPercent?: number
}

/** Resolved row geometry — mm for layout engine, % for flex side columns (of inner row). */
export interface ColumnLayout {
  innerRowMm: number
  logoWidthMm: number
  qrWidthMm: number
  centerWidthMm: number
  /** Flex `width` on `.label-left-column` — percent of `.label-preview-container` content box. */
  logoWidthPercent: number
  /** Flex `width` on `.label-right-column` — same basis as logo. */
  qrWidthPercent: number
  gapMm: number
  gapCount: number
}

function resolveSidePercents(input: ColumnLayoutInput): { logoPercent: number; qrPercent: number } {
  let logoPercent = input.hasLogo
    ? clampColumnWidthPercent(input.logoColumnWidthPercent, LOGO_COLUMN_WIDTH)
    : 0
  let qrPercent = input.hasQr
    ? clampColumnWidthPercent(input.qrColumnWidthPercent, QR_COLUMN_WIDTH)
    : 0

  const maxSideTotal = 100 - MIN_CENTER_COLUMN_PERCENT
  if (logoPercent + qrPercent > maxSideTotal) {
    const scale = maxSideTotal / (logoPercent + qrPercent)
    logoPercent = Math.round(logoPercent * scale)
    qrPercent = Math.round(qrPercent * scale)
  }

  return { logoPercent, qrPercent }
}

/**
 * Single source for three-column row sizing.
 * Matches `LabelPreview.css`: flex row inside padded `.label-preview-container`;
 * side columns use `width: N%` of the row content box; `gap` equals stock padding.
 */
export function computeColumnLayout(input: ColumnLayoutInput): ColumnLayout {
  const innerRowMm = Math.max(0, input.labelWidthMm - input.paddingMm * 2)
  const { logoPercent, qrPercent } = resolveSidePercents(input)
  const gapCount = (input.hasLogo ? 1 : 0) + (input.hasQr ? 1 : 0)
  const gapMm = input.paddingMm

  const logoWidthMm = input.hasLogo ? innerRowMm * (logoPercent / 100) : 0
  const qrWidthMm = input.hasQr ? innerRowMm * (qrPercent / 100) : 0
  const minCenterMm = innerRowMm * (MIN_CENTER_COLUMN_PERCENT / 100)
  const centerWidthMm = Math.max(
    minCenterMm,
    innerRowMm - logoWidthMm - qrWidthMm - gapMm * gapCount,
  )

  return {
    innerRowMm,
    logoWidthMm,
    qrWidthMm,
    centerWidthMm,
    logoWidthPercent: logoPercent,
    qrWidthPercent: qrPercent,
    gapMm,
    gapCount,
  }
}
