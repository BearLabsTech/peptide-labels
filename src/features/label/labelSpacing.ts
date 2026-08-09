/**
 * Single source for spacing multipliers and absolute gaps that `LabelPreview.css`
 * renders and layout math sometimes reuses. Mirrors the `labelTypography.ts`
 * pattern: one named constant per spacing relationship, emitted as CSS custom
 * properties (see `labelSpacingCssVars.ts`) so a CSS-only edit cannot silently
 * disagree with TypeScript.
 *
 * `--label-pad` itself stays authored per stock (`LabelStock.paddingMm` →
 * `labelSurfaceStyle.ts`). Values here are either:
 * - unitless fractions of `--label-pad` (CSS: `calc(var(--label-pad) * var(--x))`)
 * - absolute lengths in cqw (CSS: `var(--x)` directly)
 *
 * This module stays free of React imports on purpose — layout math may import
 * it; the `CSSProperties` presenter lives in `labelSpacingCssVars.ts`.
 */

export const LABEL_SPACING = {
  /**
   * Gap between title band and main row (and dense-primary title→body), as a
   * fraction of `--label-pad`. Above one pad unit so bold title descenders
   * (e.g. the "g" in "20mg") clear section-box outlines. The fit stack still
   * reserves one full `paddingMm`; any extra beyond that is charged against
   * section-box pad slack so title size is preserved.
   */
  titleBandGapFrac: 1.5,
  /**
   * Gap between compound title and the horizontal badge row in sparse
   * composition, as a fraction of `--label-pad`. Same descender clearance
   * idea as {@link titleBandGapFrac}.
   */
  sparseTitleTestingGapFrac: 1.5,
  /** `.label-right-column` padding-left, as a fraction of `--label-pad`. */
  testingColumnPadLeftFrac: 0.65,
  /** Gap between test indicators and QR slots inside `.label-right-column`, in cqw. */
  testingColumnGapCqw: 1.5,
  /** Top padding on `.label-qr-slot`, in cqw. */
  qrSlotPadTopCqw: 0.6,
} as const

/**
 * Max extra per-side vertical pad inside a section box, as a multiple of the
 * base `boxPadVerticalCqw` pad. Layout-math only (not a CSS var): leftover
 * stack slack beyond this stays outside the boxes so title size and the
 * title↔box gap win over inflating empty box guts.
 */
export const BODY_BOX_SLACK_PAD_MAX_MULTIPLE = 2

export type LabelSpacingKey = keyof typeof LABEL_SPACING

/** CSS custom property name that carries each {@link LABEL_SPACING} metric. */
export const SPACING_CSS_VAR_NAME: Record<LabelSpacingKey, `--${string}`> = {
  titleBandGapFrac: '--label-title-band-gap-frac',
  sparseTitleTestingGapFrac: '--label-sparse-title-testing-gap-frac',
  testingColumnPadLeftFrac: '--label-testing-column-pad-left-frac',
  testingColumnGapCqw: '--label-testing-column-gap-cqw',
  qrSlotPadTopCqw: '--label-qr-slot-pad-top-cqw',
}

/**
 * CSS unit suffix each metric is emitted with. Pad-relative fractions are
 * unitless so CSS can multiply them; absolute gaps carry `cqw`.
 */
export const SPACING_CSS_VAR_UNIT: Record<LabelSpacingKey, string> = {
  titleBandGapFrac: '',
  sparseTitleTestingGapFrac: '',
  testingColumnPadLeftFrac: '',
  testingColumnGapCqw: 'cqw',
  qrSlotPadTopCqw: 'cqw',
}

/** CSS custom property name for a given metric — exported for the drift-detection test. */
export function labelSpacingCssVarName(key: LabelSpacingKey): `--${string}` {
  return SPACING_CSS_VAR_NAME[key]
}
