import type { CSSProperties } from 'react'
import { cssVars } from '../../shared/cssVars'

/**
 * Single source for the typography metrics `LabelLayoutEngine.ts` uses to
 * predict fit and `LabelPreview.css` uses to render. Before this module,
 * these seven numbers were hand-copied into both places — a purely visual
 * CSS edit could silently disagree with what the engine predicted would fit.
 * Now the engine imports these values directly and the preview emits them
 * as CSS custom properties (see {@link labelTypographyCssVars}), so there is
 * exactly one place to change any of them.
 */
export const LABEL_TYPOGRAPHY = {
  /** Section label ("RECONSTITUTION" etc.) font size, as a fraction of the boxed-section body font size. */
  sectionLabelEm: 0.55,
  /** Section body text font size, as a fraction of the boxed-section body font size. */
  contentEm: 0.82,
  /** Section body text line-height (unitless, relative to its own font size). */
  contentLineHeightEm: 1.25,
  /** `.label-preview-box` border width. The engine's height estimate counts this twice (top + bottom). */
  borderWidthPx: 2,
  /**
   * `.label-preview-box` vertical padding, in cqw. The box also has 0.8cqw
   * horizontal padding that only affects width, not the height the engine
   * estimates — intentionally not modeled here, and left as a literal in
   * `LabelPreview.css`.
   */
  boxPadVerticalCqw: 0.5,
  /** Gap between stacked boxed sections in `.label-body-area`, in cqw. */
  boxGapCqw: 0.5,
  /** Bold uppercase title line-height, as a fraction of font size. Distinct from the ~0.95em glyph-width estimate used for title wrapping. */
  titleLineHeightEm: 0.95,
} as const

export type LabelTypographyKey = keyof typeof LABEL_TYPOGRAPHY

/** CSS custom property name that carries each {@link LABEL_TYPOGRAPHY} metric. */
const CSS_VAR_NAME: Record<LabelTypographyKey, `--${string}`> = {
  sectionLabelEm: '--label-section-label-em',
  contentEm: '--label-content-em',
  contentLineHeightEm: '--label-content-line-height',
  borderWidthPx: '--label-box-border-width-px',
  boxPadVerticalCqw: '--label-box-pad-vertical-cqw',
  boxGapCqw: '--label-box-gap-cqw',
  titleLineHeightEm: '--label-title-line-height',
}

/**
 * CSS unit suffix each metric is emitted with. Ratios and line-heights are
 * unitless numbers so CSS can multiply them (`calc(var(--x) * 1em)`);
 * `borderWidthPx`/`boxPadVerticalCqw`/`boxGapCqw` are used as literal CSS
 * lengths so they carry their unit.
 */
const CSS_VAR_UNIT: Record<LabelTypographyKey, string> = {
  sectionLabelEm: '',
  contentEm: '',
  contentLineHeightEm: '',
  borderWidthPx: 'px',
  boxPadVerticalCqw: 'cqw',
  boxGapCqw: 'cqw',
  titleLineHeightEm: '',
}

/** CSS custom property name for a given metric — exported for the drift-detection test. */
export function labelTypographyCssVarName(key: LabelTypographyKey): `--${string}` {
  return CSS_VAR_NAME[key]
}

/** Emit every {@link LABEL_TYPOGRAPHY} metric as a CSS custom property on the label container. */
export function labelTypographyCssVars(): CSSProperties {
  const record = {} as Record<`--${string}`, string>
  for (const key of Object.keys(LABEL_TYPOGRAPHY) as LabelTypographyKey[]) {
    record[CSS_VAR_NAME[key]] = `${LABEL_TYPOGRAPHY[key]}${CSS_VAR_UNIT[key]}`
  }
  return cssVars(record)
}
