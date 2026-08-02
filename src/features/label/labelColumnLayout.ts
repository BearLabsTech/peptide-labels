import {
  clampColumnWidthPercent,
  LOGO_COLUMN_WIDTH,
  MIN_CENTER_COLUMN_PERCENT,
  QR_COLUMN_WIDTH,
} from './labelLayoutConstants'

export interface ColumnLayoutInput {
  readonly labelWidthMm: number
  readonly paddingMm: number
  readonly hasLogo: boolean
  readonly hasQr: boolean
  readonly logoColumnWidthPercent?: number
  readonly qrColumnWidthPercent?: number
}

/** Resolved row geometry — mm for layout engine, % for flex side columns (of inner row). */
export interface ColumnLayout {
  readonly innerRowMm: number
  readonly logoWidthMm: number
  readonly qrWidthMm: number
  readonly centerWidthMm: number
  /** Flex `width` on `.label-left-column` — percent of `.label-preview-container` content box. */
  readonly logoWidthPercent: number
  /** Flex `width` on `.label-right-column` — same basis as logo. */
  readonly qrWidthPercent: number
  readonly gapMm: number
  readonly gapCount: number
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

/** Identity-header title band: axis on center column, span until inner row edge. */
export interface IdentityHeaderTitleBand {
  /** Horizontal center of the center column, 0–1 from the left inner-row edge. */
  readonly axisFraction: number
  /** Max title width centered on {@link axisFraction}, 0–1 of inner row width. */
  readonly spanFraction: number
}

export function computeIdentityHeaderTitleBand(
  columns: ColumnLayout,
  hasLogo: boolean,
): IdentityHeaderTitleBand {
  let axisMm = 0
  if (hasLogo) axisMm += columns.logoWidthMm + columns.gapMm
  axisMm += columns.centerWidthMm / 2

  const spanMm = 2 * Math.min(axisMm, columns.innerRowMm - axisMm)

  return {
    axisFraction: axisMm / columns.innerRowMm,
    spanFraction: spanMm / columns.innerRowMm,
  }
}

/** Break out of the center flex cell to the full inner row; shift so text centers on the center column axis. */
export interface IdentityHeaderTitleBreakout {
  readonly axisFraction: number
  /** Breakout width as % of the center column flex cell. */
  readonly breakoutWidthPct: number
  /** Negative left margin as % of the center column flex cell. */
  readonly breakoutMarginLeftPct: number
}

export function computeIdentityHeaderTitleBreakout(
  columns: ColumnLayout,
  hasLogo: boolean,
  hasQr: boolean,
): IdentityHeaderTitleBreakout {
  const band = computeIdentityHeaderTitleBand(columns, hasLogo)
  const leftOverhangMm = hasLogo ? columns.logoWidthMm + columns.gapMm : 0
  const rightOverhangMm = hasQr ? columns.qrWidthMm + columns.gapMm : 0
  const centerMm = columns.centerWidthMm

  return {
    axisFraction: band.axisFraction,
    breakoutWidthPct: ((leftOverhangMm + centerMm + rightOverhangMm) / centerMm) * 100,
    breakoutMarginLeftPct: -(leftOverhangMm / centerMm) * 100,
  }
}

/** Danger-mode title uses a fraction of the full inner row (distinct from pad multipliers). */
export const DANGER_TITLE_WIDTH_FRAC = 0.65

export function computeIdentityHeaderTitleWidthMm(
  columns: ColumnLayout,
  isDanger: boolean,
  dangerWidthFrac = DANGER_TITLE_WIDTH_FRAC,
): number {
  return isDanger ? columns.innerRowMm * dangerWidthFrac : columns.innerRowMm
}
