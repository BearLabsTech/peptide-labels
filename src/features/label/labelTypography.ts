/**
 * Single source for the typography metrics `LabelLayoutEngine.ts` uses to
 * predict fit and `LabelPreview.css` uses to render. Before this module,
 * these metrics were hand-copied into both places — a purely visual
 * CSS edit could silently disagree with what the engine predicted would fit.
 * Now the engine imports these values directly and the preview emits them
 * as CSS custom properties (see `labelTypographyCssVars.ts`), so there is
 * exactly one place to change any of them.
 *
 * This module stays free of React imports on purpose: `LabelLayoutEngine.ts`
 * (pure layout math) sits on its import graph, and `domain-label-architecture.mdc`
 * treats that engine as core math with no UI-framework dependency. The
 * `CSSProperties`-typed presenter lives in `labelTypographyCssVars.ts` instead.
 */
/**
 * Font stack shared by preview CSS (`.label-preview-container`) and
 * CanvasTextMeasurer. Keep these in sync — measurement must match render.
 */
export const LABEL_FONT_FAMILY = 'Arial, Helvetica, sans-serif'

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
  /**
   * Extra top padding on the title (fraction of font size) so bold caps that
   * ink outside the 0.95em line box clear the rounded sticker's overflow:hidden.
   * Mirrored in `estimateTitleHeightPx` and `.label-preview-title` / `.danger-title-wrapper`.
   */
  titleInkOverflowEm: 0.14,
} as const

export type LabelTypographyKey = keyof typeof LABEL_TYPOGRAPHY

/** CSS custom property name that carries each {@link LABEL_TYPOGRAPHY} metric. */
export const CSS_VAR_NAME: Record<LabelTypographyKey, `--${string}`> = {
  sectionLabelEm: '--label-section-label-em',
  contentEm: '--label-content-em',
  contentLineHeightEm: '--label-content-line-height',
  borderWidthPx: '--label-box-border-width-px',
  boxPadVerticalCqw: '--label-box-pad-vertical-cqw',
  boxGapCqw: '--label-box-gap-cqw',
  titleLineHeightEm: '--label-title-line-height',
  titleInkOverflowEm: '--label-title-ink-overflow',
}

/**
 * CSS unit suffix each metric is emitted with. Ratios and line-heights are
 * unitless numbers so CSS can multiply them (`calc(var(--x) * 1em)`);
 * `borderWidthPx`/`boxPadVerticalCqw`/`boxGapCqw` are used as literal CSS
 * lengths so they carry their unit.
 */
export const CSS_VAR_UNIT: Record<LabelTypographyKey, string> = {
  sectionLabelEm: '',
  contentEm: '',
  contentLineHeightEm: '',
  borderWidthPx: 'px',
  boxPadVerticalCqw: 'cqw',
  boxGapCqw: 'cqw',
  titleLineHeightEm: '',
  titleInkOverflowEm: '',
}

/** CSS custom property name for a given metric — exported for the drift-detection test. */
export function labelTypographyCssVarName(key: LabelTypographyKey): `--${string}` {
  return CSS_VAR_NAME[key]
}
