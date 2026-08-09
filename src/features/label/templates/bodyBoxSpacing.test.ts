import { describe, it, expect } from 'vitest'
import { mmToPx } from '../../../print/dimensions'
import { LABEL_TYPOGRAPHY } from '../labelTypography'
import { BODY_BOX_SLACK_PAD_MAX_MULTIPLE } from '../labelSpacing'
import { computeBodyBoxVerticalPadPx } from './bodyBoxSpacing'

const DPI = 300
const LABEL_WIDTH_PX = mmToPx(40, DPI)
const BASE_PAD_PX = LABEL_WIDTH_PX * (LABEL_TYPOGRAPHY.boxPadVerticalCqw / 100)

describe('computeBodyBoxVerticalPadPx', () => {
  it('should return only the base padding when there are no rows', () => {
    expect(
      computeBodyBoxVerticalPadPx({
        usedStackHeightPx: 50,
        innerHeightMm: 19,
        effectiveDpi: DPI,
        rowCount: 0,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
  })

  it('should add a share of leftover slack when content is sparse but still under the cap', () => {
    const budgetPx = mmToPx(19, DPI)
    // Modest slack so uncapped extra stays under the max multiple.
    const usedStackHeightPx = budgetPx - BASE_PAD_PX * 2
    const pad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      rowCount: 1,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    const slackPx = budgetPx - usedStackHeightPx
    expect(pad).toBeCloseTo(BASE_PAD_PX + slackPx / 2, 5)
    expect(pad).toBeGreaterThan(BASE_PAD_PX)
  })

  it('should return only the base padding when used height meets or exceeds the budget', () => {
    const budgetPx = mmToPx(19, DPI)
    expect(
      computeBodyBoxVerticalPadPx({
        usedStackHeightPx: budgetPx,
        innerHeightMm: 19,
        effectiveDpi: DPI,
        rowCount: 2,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
    expect(
      computeBodyBoxVerticalPadPx({
        usedStackHeightPx: budgetPx + 40,
        innerHeightMm: 19,
        effectiveDpi: DPI,
        rowCount: 2,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
  })

  it('should split modest slack evenly across rows so total extra padding equals slack', () => {
    const budgetPx = mmToPx(19, DPI)
    const rowCount = 3
    const slackPx = BASE_PAD_PX * rowCount // stays under the per-side cap
    const usedStackHeightPx = budgetPx - slackPx
    const pad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      rowCount,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    const extraPerSide = pad - BASE_PAD_PX
    expect(rowCount * extraPerSide * 2).toBeCloseTo(slackPx, 5)
  })

  it('should give a single side-by-side row more pad than two stacked rows for the same modest slack', () => {
    const budgetPx = mmToPx(19, DPI)
    const slackPx = BASE_PAD_PX * 2
    const usedStackHeightPx = budgetPx - slackPx
    const sideBySidePad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      rowCount: 1,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    const stackedAsTwoRowsPad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      rowCount: 2,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    expect(sideBySidePad).toBeCloseTo(BASE_PAD_PX + slackPx / 2, 5)
    expect(stackedAsTwoRowsPad).toBeCloseTo(BASE_PAD_PX + slackPx / 4, 5)
    expect(sideBySidePad).toBeGreaterThan(stackedAsTwoRowsPad)
  })

  it('should cap extra pad so huge slack cannot inflate empty box guts', () => {
    const budgetPx = mmToPx(19, DPI)
    const usedStackHeightPx = Math.floor(budgetPx * 0.2)
    const pad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      rowCount: 1,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    const maxPad = BASE_PAD_PX * (1 + BODY_BOX_SLACK_PAD_MAX_MULTIPLE)
    expect(pad).toBeCloseTo(maxPad, 5)
    expect(pad).toBeLessThan(BASE_PAD_PX + (budgetPx - usedStackHeightPx) / 2)
  })
})
