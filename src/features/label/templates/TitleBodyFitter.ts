import {
  LabelLayoutEngine,
  type BoxedBodyLayoutInput,
  type BoxedSection,
  type LabelLayoutInput,
  type LabelLayoutResult,
} from '../LabelLayoutEngine'
import { MIN_FONT_SIZE_PX, MIN_TITLE_TO_BODY_FONT_RATIO } from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../print/dimensions'

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

/** The longest section header ("RECONSTITUTION") must still fit the boxed body's width at the candidate's body font. */
export function createSectionLabelWidthConstraint(
  layoutEngine: LabelLayoutEngine,
  baseWidthMm: number,
): FitConstraint {
  return {
    isSatisfiedBy: (candidate) => layoutEngine.sectionLabelsFitBoxWidth(baseWidthMm, candidate.bodyLayout.fontSizePx),
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
    const { titleInput, boxes, demotedTitle, baseWidthMm, labelWidthPx, innerHeightMm, titleBodyGapMm } = input
    const bodyInputBase: BodyInputBase = { boxes, demotedLine: demotedTitle, widthMm: baseWidthMm, labelWidthPx }
    const innerHeightPx = mmToPx(innerHeightMm, this.effectiveDpi)
    const constraints: readonly FitConstraint[] = [
      createSectionLabelWidthConstraint(this.layoutEngine, baseWidthMm),
      createStackHeightConstraint(this.layoutEngine, titleBodyGapMm, bodyInputBase, innerHeightPx),
    ]

    const titleLayout = this.layoutEngine.layout(titleInput)
    const bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleLayout, titleBodyGapMm)

    let candidate = this.shrinkBodyFont(titleLayout, bodyHeightMm, bodyInputBase, constraints)
    if (!this.satisfiesAll(candidate, constraints)) {
      candidate = this.shrinkTitleThenBody(titleInput, candidate, innerHeightMm, titleBodyGapMm, bodyInputBase, constraints)
    }
    return this.boostTitleRelativeToBody(titleInput, candidate, innerHeightMm, titleBodyGapMm, bodyInputBase, constraints)
  }

  /** Phase 1: title fixed at its own best fit; shrink only the body font until the pair fits (or bottoms out at the minimum). */
  private shrinkBodyFont(
    titleLayout: LabelLayoutResult,
    bodyHeightMm: number,
    bodyInputBase: BodyInputBase,
    constraints: readonly FitConstraint[],
  ): FitCandidate {
    let bodyLayout = this.layoutEngine.layoutBoxedBody({ ...bodyInputBase, heightMm: bodyHeightMm })
    for (let bodyFont = bodyLayout.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
      bodyLayout = this.layoutBodyAtFont(bodyInputBase, bodyHeightMm, bodyFont)
      if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, constraints)) break
    }
    return { titleLayout, bodyLayout, bodyHeightMm }
  }

  /** Phase 2: if 1 could not make the pair fit, shrink the title too, refitting the body at each title size. */
  private shrinkTitleThenBody(
    titleInput: LabelLayoutInput,
    candidate: FitCandidate,
    innerHeightMm: number,
    titleBodyGapMm: number,
    bodyInputBase: BodyInputBase,
    constraints: readonly FitConstraint[],
  ): FitCandidate {
    let { titleLayout, bodyLayout, bodyHeightMm } = candidate
    for (let titleFont = titleLayout.fontSizePx - 1; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont)
      if (!titleAttempt) continue
      bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm)
      const refitBody = this.layoutEngine.layoutBoxedBody({ ...bodyInputBase, heightMm: bodyHeightMm })
      for (let bodyFont = refitBody.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
        titleLayout = titleAttempt
        bodyLayout = this.layoutBodyAtFont(bodyInputBase, bodyHeightMm, bodyFont)
        if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, constraints)) break
      }
      if (this.satisfiesAll({ titleLayout, bodyLayout, bodyHeightMm }, constraints)) break
    }
    return { titleLayout, bodyLayout, bodyHeightMm }
  }

  /** Phase 3: once something fits, grow the title back toward `MIN_TITLE_TO_BODY_FONT_RATIO` if 1/2 left it too small relative to the body. */
  private boostTitleRelativeToBody(
    titleInput: LabelLayoutInput,
    candidate: FitCandidate,
    innerHeightMm: number,
    titleBodyGapMm: number,
    bodyInputBase: BodyInputBase,
    constraints: readonly FitConstraint[],
  ): FitCandidate {
    const { titleLayout, bodyLayout } = candidate

    if (titleLayout.fontSizePx >= bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO) {
      return candidate
    }

    for (let titleFont = this.maxFontSizePx; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont)
      if (!titleAttempt) continue

      const attemptBodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm)
      const maxBodyFont = Math.floor(titleFont / MIN_TITLE_TO_BODY_FONT_RATIO)

      for (let bodyFont = Math.min(maxBodyFont, bodyLayout.fontSizePx); bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
        const bodyAttempt = this.layoutBodyAtFont(bodyInputBase, attemptBodyHeightMm, bodyFont)
        const attemptCandidate: FitCandidate = {
          titleLayout: titleAttempt,
          bodyLayout: bodyAttempt,
          bodyHeightMm: attemptBodyHeightMm,
        }
        if (this.satisfiesAll(attemptCandidate, constraints)) {
          return attemptCandidate
        }
      }
    }

    return candidate
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
