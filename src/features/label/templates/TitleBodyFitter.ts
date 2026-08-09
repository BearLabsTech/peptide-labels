import {
  LabelLayoutEngine,
  type BoxedBodyLayoutInput,
  type BoxedSection,
  type LabelLayoutInput,
  type LabelLayoutResult,
} from '../LabelLayoutEngine'
import { MIN_FONT_SIZE_PX, MIN_TITLE_TO_BODY_FONT_RATIO } from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../../../print/dimensions'

/** One attempt at laying out the title and boxed body together. */
export interface FitCandidate {
  readonly titleLayout: LabelLayoutResult
  readonly bodyLayout: LabelLayoutResult
  readonly bodyHeightMm: number
}

/** A pass/fail rule a {@link FitCandidate} must satisfy to be an acceptable label layout. */
export interface FitConstraint {
  isSatisfiedBy(candidate: FitCandidate): boolean
}

export interface TitleBodyFitInput {
  readonly titleInput: LabelLayoutInput
  readonly boxes: readonly BoxedSection[]
  readonly demotedTitle?: string
  readonly baseWidthMm: number
  readonly labelWidthPx: number
  readonly innerHeightMm: number
  readonly titleBodyGapMm: number
}

type BodyInputBase = Omit<BoxedBodyLayoutInput, 'heightMm'>

/** Shared inputs for the three font-search phases after the initial title layout. */
type FitSearchContext = {
  readonly titleInput: LabelLayoutInput
  readonly bodyInputBase: BodyInputBase
  readonly innerHeightMm: number
  readonly titleBodyGapMm: number
  readonly constraints: readonly FitConstraint[]
}

/** The longest section header ("RECONSTITUTION") must still fit the boxed body's width at the candidate's body font. */
export function createSectionLabelWidthConstraint(
  layoutEngine: LabelLayoutEngine,
  baseWidthMm: number,
  boxCount: number,
  labelWidthPx: number,
): FitConstraint {
  return {
    isSatisfiedBy: (candidate) => layoutEngine.sectionLabelsFitBoxWidth(
      baseWidthMm,
      candidate.bodyLayout.fontSizePx,
      boxCount,
      labelWidthPx,
    ),
  }
}

/** Title height + gap + boxed body height together must not exceed the label's usable inner height. */
export function createStackHeightConstraint(
  layoutEngine: LabelLayoutEngine,
  titleBodyGapMm: number,
  bodyInputBase: BodyInputBase,
  innerHeightPx: number,
): FitConstraint {
  return {
    isSatisfiedBy: (candidate) => layoutEngine.estimateCenterStackHeightPx(
      candidate.titleLayout.wrappedLines.length,
      candidate.titleLayout.fontSizePx,
      titleBodyGapMm,
      { ...bodyInputBase, heightMm: candidate.bodyHeightMm },
      candidate.bodyLayout.fontSizePx,
    ) <= innerHeightPx,
  }
}

/**
 * Searches for the largest title/body font pair that fits the identity-header
 * label's inner height, then boosts the title back toward the product's
 * minimum title-to-body ratio if the fit search left it too small.
 *
 * Three phases, run in order — each a direct extraction of one of the
 * original nested loops in what used to be `LabelComposer.fitTitleAndBodyLayouts`
 * (moved to `IdentityHeaderTemplate` unchanged in action 3.1, then rebuilt here
 * around `FitCandidate`/`FitConstraint` in action 3.2, same iteration order):
 *
 *   1. `shrinkBodyFont` — hold the title at its own best-fit size; shrink only the body font.
 *   2. `shrinkTitleThenBody` — if 1 still does not fit, shrink the title too, refitting the body's available height and font at each title size.
 *   3. `boostTitleRelativeToBody` — once something fits, grow the title back up if 1/2 left it too small relative to the body.
 */
export class TitleBodyFitter {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly effectiveDpi: number
  private readonly maxFontSizePx: number

  constructor(layoutEngine: LabelLayoutEngine, effectiveDpi: number, maxFontSizePx: number) {
    this.layoutEngine = layoutEngine
    this.effectiveDpi = effectiveDpi
    this.maxFontSizePx = maxFontSizePx
  }

  findBestFit(input: TitleBodyFitInput): FitCandidate {
    const ctx = this.createSearchContext(input)
    const titleLayout = this.layoutEngine.layout(ctx.titleInput)
    const bodyHeightMm = this.remainingBodyHeightMm(ctx.innerHeightMm, titleLayout, ctx.titleBodyGapMm)

    let candidate = this.shrinkBodyFont(titleLayout, bodyHeightMm, ctx)
    if (!this.satisfiesAll(candidate, ctx.constraints)) {
      candidate = this.shrinkTitleThenBody(candidate, ctx)
    }
    return this.boostTitleRelativeToBody(candidate, ctx)
  }

  private createSearchContext(input: TitleBodyFitInput): FitSearchContext {
    const { titleInput, boxes, demotedTitle, baseWidthMm, labelWidthPx, innerHeightMm, titleBodyGapMm } = input
    const bodyInputBase: BodyInputBase = { boxes, demotedLine: demotedTitle, widthMm: baseWidthMm, labelWidthPx }
    const innerHeightPx = mmToPx(innerHeightMm, this.effectiveDpi)
    return {
      titleInput,
      bodyInputBase,
      innerHeightMm,
      titleBodyGapMm,
      constraints: [
        createSectionLabelWidthConstraint(this.layoutEngine, baseWidthMm, boxes.length, labelWidthPx),
        createStackHeightConstraint(this.layoutEngine, titleBodyGapMm, bodyInputBase, innerHeightPx),
      ],
    }
  }

  /** Phase 1: title fixed at its own best fit; shrink only the body font until the pair fits (or bottoms out at the minimum). */
  private shrinkBodyFont(
    titleLayout: LabelLayoutResult,
    bodyHeightMm: number,
    ctx: FitSearchContext,
  ): FitCandidate {
    let bodyLayout = this.layoutEngine.layoutBoxedBody({ ...ctx.bodyInputBase, heightMm: bodyHeightMm })
    for (let bodyFont = bodyLayout.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
      bodyLayout = this.layoutBodyAtFont(ctx.bodyInputBase, bodyHeightMm, bodyFont)
      if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, ctx.constraints)) break
    }
    return { titleLayout, bodyLayout, bodyHeightMm }
  }

  /** Phase 2: if 1 could not make the pair fit, shrink the title too, refitting the body at each title size. */
  private shrinkTitleThenBody(candidate: FitCandidate, ctx: FitSearchContext): FitCandidate {
    let { titleLayout, bodyLayout, bodyHeightMm } = candidate
    for (let titleFont = titleLayout.fontSizePx - 1; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(ctx.titleInput, titleFont)
      if (!titleAttempt) continue
      bodyHeightMm = this.remainingBodyHeightMm(ctx.innerHeightMm, titleAttempt, ctx.titleBodyGapMm)
      const refitBody = this.layoutEngine.layoutBoxedBody({ ...ctx.bodyInputBase, heightMm: bodyHeightMm })
      for (let bodyFont = refitBody.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
        titleLayout = titleAttempt
        bodyLayout = this.layoutBodyAtFont(ctx.bodyInputBase, bodyHeightMm, bodyFont)
        if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, ctx.constraints)) break
      }
      if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, ctx.constraints)) break
    }
    return { titleLayout, bodyLayout, bodyHeightMm }
  }

  /** Phase 3: once something fits, grow the title back toward `MIN_TITLE_TO_BODY_FONT_RATIO` if 1/2 left it too small relative to the body. */
  private boostTitleRelativeToBody(candidate: FitCandidate, ctx: FitSearchContext): FitCandidate {
    if (candidate.titleLayout.fontSizePx >= candidate.bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO) {
      return candidate
    }

    for (let titleFont = this.maxFontSizePx; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const boosted = this.tryBoostAtTitleFont(titleFont, candidate, ctx)
      if (boosted) return boosted
    }

    return candidate
  }

  private tryBoostAtTitleFont(
    titleFont: number,
    baseline: FitCandidate,
    ctx: FitSearchContext,
  ): FitCandidate | null {
    const titleAttempt = this.layoutEngine.layoutAtSize(ctx.titleInput, titleFont)
    if (!titleAttempt) return null

    const bodyHeightMm = this.remainingBodyHeightMm(ctx.innerHeightMm, titleAttempt, ctx.titleBodyGapMm)
    const maxBodyFont = Math.min(
      Math.floor(titleFont / MIN_TITLE_TO_BODY_FONT_RATIO),
      baseline.bodyLayout.fontSizePx,
    )

    for (let bodyFont = maxBodyFont; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
      const attempt: FitCandidate = {
        titleLayout: titleAttempt,
        bodyLayout: this.layoutBodyAtFont(ctx.bodyInputBase, bodyHeightMm, bodyFont),
        bodyHeightMm,
      }
      if (this.satisfiesAll(attempt, ctx.constraints)) return attempt
    }
    return null
  }

  private layoutBodyAtFont(bodyInputBase: BodyInputBase, bodyHeightMm: number, bodyFontPx: number): LabelLayoutResult {
    return {
      fontSizePx: bodyFontPx,
      wrappedLines: this.layoutEngine.layoutBoxedBody({ ...bodyInputBase, heightMm: bodyHeightMm }).wrappedLines,
    }
  }

  private remainingBodyHeightMm(
    innerHeightMm: number,
    titleLayout: LabelLayoutResult,
    titleBodyGapMm: number,
  ): number {
    const innerPx = mmToPx(innerHeightMm, this.effectiveDpi)
    const titlePx = this.layoutEngine.estimateTitleHeightPx(titleLayout.wrappedLines.length, titleLayout.fontSizePx)
    const gapPx = mmToPx(titleBodyGapMm, this.effectiveDpi)
    const remainingPx = Math.max(0, innerPx - titlePx - gapPx)
    return pxToMm(remainingPx, this.effectiveDpi)
  }

  private satisfiesAll(candidate: FitCandidate, constraints: readonly FitConstraint[]): boolean {
    return constraints.every((constraint) => constraint.isSatisfiedBy(candidate))
  }
}
