import { describe, it, expect } from 'vitest'
import { LabelLayoutEngine } from '../LabelLayoutEngine'
import { MIN_FONT_SIZE_PX, MIN_TITLE_TO_BODY_FONT_RATIO } from '../labelLayoutConstants'
import { mmToPx } from '../../../print/dimensions'
import {
  TitleBodyFitter,
  createSectionLabelWidthConstraint,
  createStackHeightConstraint,
  type FitCandidate,
  type TitleBodyFitInput,
} from './TitleBodyFitter'

const DPI = 203
const MAX_FONT_SIZE_PX = 26

function makeFitter(dpi = DPI, maxFontSizePx = MAX_FONT_SIZE_PX): { fitter: TitleBodyFitter; engine: LabelLayoutEngine } {
  const engine = new LabelLayoutEngine(dpi, maxFontSizePx)
  return { fitter: new TitleBodyFitter(engine, dpi, maxFontSizePx), engine }
}

function baseInput(overrides: Partial<TitleBodyFitInput> = {}): TitleBodyFitInput {
  return {
    titleInput: {
      lines: ['OK'],
      widthMm: 30,
      heightMm: 9,
      fontWeight: 900,
      widthSafety: 1,
    },
    boxes: [{ lines: ['2 ml', '10mg per ml'] }],
    demotedTitle: undefined,
    baseWidthMm: 14,
    labelWidthPx: mmToPx(40, DPI),
    innerHeightMm: 16,
    titleBodyGapMm: 2,
    ...overrides,
  }
}

/** Both constraints the search must satisfy, checked independently of the fitter's own search. */
function satisfiesFitConstraints(
  engine: LabelLayoutEngine,
  input: TitleBodyFitInput,
  candidate: FitCandidate,
): boolean {
  const bodyInputBase = { boxes: input.boxes, demotedLine: input.demotedTitle, widthMm: input.baseWidthMm, labelWidthPx: input.labelWidthPx }
  const innerHeightPx = mmToPx(input.innerHeightMm, DPI)
  const widthConstraint = createSectionLabelWidthConstraint(engine, input.baseWidthMm, input.boxes.length, input.labelWidthPx)
  const heightConstraint = createStackHeightConstraint(engine, input.titleBodyGapMm, bodyInputBase, innerHeightPx)
  return widthConstraint.isSatisfiedBy(candidate) && heightConstraint.isSatisfiedBy(candidate)
}

describe('createSectionLabelWidthConstraint', () => {
  const labelWidthPx = mmToPx(40, DPI)

  it('should be satisfied when the boxed body width comfortably fits the longest section label at the candidate font', () => {
    const engine = new LabelLayoutEngine(DPI)
    const constraint = createSectionLabelWidthConstraint(engine, 40, 1, labelWidthPx)
    const candidate: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 20 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 10 },
      bodyHeightMm: 8,
    }
    expect(constraint.isSatisfiedBy(candidate)).toBe(true)
  })

  it('should fail when the box is too narrow for "RECONSTITUTION" at the candidate body font', () => {
    const engine = new LabelLayoutEngine(DPI)
    const constraint = createSectionLabelWidthConstraint(engine, 6, 1, labelWidthPx)
    const candidate: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 20 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 24 },
      bodyHeightMm: 8,
    }
    expect(constraint.isSatisfiedBy(candidate)).toBe(false)
  })

  it('should depend only on the candidate body font, not the title font', () => {
    const engine = new LabelLayoutEngine(DPI)
    const constraint = createSectionLabelWidthConstraint(engine, 6, 1, labelWidthPx)
    const smallTitle: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 8 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 24 },
      bodyHeightMm: 8,
    }
    const bigTitle: FitCandidate = { ...smallTitle, titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 26 } }
    expect(constraint.isSatisfiedBy(smallTitle)).toBe(constraint.isSatisfiedBy(bigTitle))
  })

  it('should fail sooner when boxCount is 2 (half-width section label budget)', () => {
    const engine = new LabelLayoutEngine(DPI)
    const widthMm = 14
    const candidate: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 20 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 20 },
      bodyHeightMm: 8,
    }
    const full = createSectionLabelWidthConstraint(engine, widthMm, 1, labelWidthPx)
    const half = createSectionLabelWidthConstraint(engine, widthMm, 2, labelWidthPx)
    expect(full.isSatisfiedBy(candidate)).toBe(true)
    expect(half.isSatisfiedBy(candidate)).toBe(false)
  })
})

describe('createStackHeightConstraint', () => {
  const bodyInputBase = { boxes: [{ lines: ['line'] }], widthMm: 14, labelWidthPx: mmToPx(40, DPI) }

  it('should be satisfied when the combined title and body stack fits the inner height budget', () => {
    const engine = new LabelLayoutEngine(DPI)
    const constraint = createStackHeightConstraint(engine, 2, bodyInputBase, mmToPx(100, DPI))
    const candidate: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 20 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 10 },
      bodyHeightMm: 20,
    }
    expect(constraint.isSatisfiedBy(candidate)).toBe(true)
  })

  it('should fail when the inner height budget is smaller than the stack requires', () => {
    const engine = new LabelLayoutEngine(DPI)
    const constraint = createStackHeightConstraint(engine, 2, bodyInputBase, mmToPx(4, DPI))
    const candidate: FitCandidate = {
      titleLayout: { wrappedLines: ['TITLE'], fontSizePx: 20 },
      bodyLayout: { wrappedLines: ['line'], fontSizePx: 20 },
      bodyHeightMm: 20,
    }
    expect(constraint.isSatisfiedBy(candidate)).toBe(false)
  })
})

describe('TitleBodyFitter.findBestFit', () => {
  it('should return a candidate that satisfies both fit constraints', () => {
    const { fitter, engine } = makeFitter()
    const input = baseInput()
    const candidate = fitter.findBestFit(input)
    expect(satisfiesFitConstraints(engine, input, candidate)).toBe(true)
  })

  it('should keep the title at least MIN_TITLE_TO_BODY_FONT_RATIO times the body font once a fit is found', () => {
    const { fitter } = makeFitter()
    const input = baseInput()
    const { titleLayout, bodyLayout } = fitter.findBestFit(input)
    expect(titleLayout.fontSizePx).toBeGreaterThanOrEqual(bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO)
  })

  it('should return the same candidate unchanged when phase 1 already satisfies the minimum title/body ratio (boost is a no-op)', () => {
    const { fitter, engine } = makeFitter()
    // Wide, short title reaches the engine max font; the narrow 14mm box caps the body
    // font by width alone (well below title/RATIO), so phase 1 already satisfies the
    // ratio and boost's early-return branch should fire without altering the candidate.
    const input = baseInput({
      titleInput: { lines: ['OK'], widthMm: 30, heightMm: 20, fontWeight: 900, widthSafety: 1 },
      baseWidthMm: 14,
      boxes: [{ lines: ['ok'] }],
      innerHeightMm: 40,
    })
    const candidate = fitter.findBestFit(input)
    const directTitleLayout = engine.layout(input.titleInput)

    expect(candidate.titleLayout.fontSizePx).toBe(directTitleLayout.fontSizePx)
    expect(candidate.titleLayout.fontSizePx)
      .toBeGreaterThanOrEqual(candidate.bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO)
  })

  it('should shrink the title (phase 2) when the body cannot fit the height budget at the title\'s own best-fit size', () => {
    const { fitter, engine } = makeFitter()
    const input = baseInput({
      titleInput: { lines: ['OK'], widthMm: 30, heightMm: 9, fontWeight: 900, widthSafety: 1 },
      boxes: [
        { lines: ['Reconstitution line one'] },
        { lines: ['Protocol line one'] },
        { lines: ['Source line one'] },
      ],
      baseWidthMm: 30,
      // Tall enough that phase 2 finds a fit above MIN after ink-overflow reserve,
      // but short enough that phase 1 alone cannot keep the title at its own best size.
      innerHeightMm: 14.5,
    })
    const directTitleLayout = engine.layout(input.titleInput)
    const candidate = fitter.findBestFit(input)

    expect(candidate.titleLayout.fontSizePx).toBeLessThan(directTitleLayout.fontSizePx)
    expect(candidate.titleLayout.fontSizePx).toBeGreaterThan(MIN_FONT_SIZE_PX)
    expect(satisfiesFitConstraints(engine, input, candidate)).toBe(true)
  })

  it('should bottom out at MIN_FONT_SIZE_PX for both title and body when nothing fits the available height', () => {
    const { fitter } = makeFitter()
    const input = baseInput({
      titleInput: { lines: ['A VERY LONG TITLE THAT WILL NOT FIT'], widthMm: 10, heightMm: 2, fontWeight: 900, widthSafety: 1 },
      boxes: [
        { lines: ['Reconstitution line one', 'Reconstitution line two', 'Reconstitution line three'] },
        { lines: ['Protocol line one', 'Protocol line two', 'Protocol line three'] },
        { lines: ['Source line one', 'Source line two', 'Source line three'] },
      ],
      baseWidthMm: 6,
      innerHeightMm: 2,
    })
    const candidate = fitter.findBestFit(input)

    expect(candidate.titleLayout.fontSizePx).toBe(MIN_FONT_SIZE_PX)
    expect(candidate.bodyLayout.fontSizePx).toBe(MIN_FONT_SIZE_PX)
  })

  it('should boost the title font (phase 3) when phase 1/2 satisfy fit but leave the ratio below MIN_TITLE_TO_BODY_FONT_RATIO', () => {
    const { fitter, engine } = makeFitter()
    // Wide baseWidthMm and a single short box line let both the title and body
    // land near the engine max font independently, undershooting the ratio and
    // forcing boost to trade body font for title font.
    const input = baseInput({
      titleInput: { lines: ['OK'], widthMm: 30, heightMm: 20, fontWeight: 900, widthSafety: 1 },
      baseWidthMm: 30,
      boxes: [{ lines: ['x'] }],
      innerHeightMm: 20,
    })
    const candidate = fitter.findBestFit(input)

    expect(candidate.titleLayout.fontSizePx).toBe(MAX_FONT_SIZE_PX)
    expect(candidate.bodyLayout.fontSizePx).toBeLessThan(MAX_FONT_SIZE_PX)
    expect(candidate.titleLayout.fontSizePx)
      .toBeGreaterThanOrEqual(candidate.bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO)
    expect(satisfiesFitConstraints(engine, input, candidate)).toBe(true)
  })

  it('should use up to the engine max font size when content is sparse and height is generous', () => {
    const { fitter, engine } = makeFitter()
    const input = baseInput({
      titleInput: { lines: ['OK'], widthMm: 30, heightMm: 20, fontWeight: 900, widthSafety: 1 },
      boxes: [{ lines: ['ok'] }],
      innerHeightMm: 40,
    })
    const candidate = fitter.findBestFit(input)
    expect(candidate.titleLayout.fontSizePx).toBeLessThanOrEqual(MAX_FONT_SIZE_PX)
    expect(candidate.bodyLayout.fontSizePx).toBeLessThanOrEqual(MAX_FONT_SIZE_PX)
    expect(Math.max(candidate.titleLayout.fontSizePx, candidate.bodyLayout.fontSizePx)).toBe(MAX_FONT_SIZE_PX)
    expect(engine.getMaxFontSizePx()).toBe(MAX_FONT_SIZE_PX)
  })
})
