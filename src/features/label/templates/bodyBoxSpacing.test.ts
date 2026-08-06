import { describe, it, expect } from 'vitest'
import { mmToPx } from '../../../print/dimensions'
import { LABEL_TYPOGRAPHY } from '../labelTypography'
import { computeBodyBoxVerticalPadPx } from './bodyBoxSpacing'

const DPI = 300
const LABEL_WIDTH_PX = mmToPx(40, DPI)
const BASE_PAD_PX = LABEL_WIDTH_PX * (LABEL_TYPOGRAPHY.boxPadVerticalCqw / 100)

describe('computeBodyBoxVerticalPadPx', () => {
  it('should return only the base padding when there are no boxes', () => {
    expect(
      computeBodyBoxVerticalPadPx({
        usedStackHeightPx: 50,
        innerHeightMm: 19,
        effectiveDpi: DPI,
        boxCount: 0,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
  })

  it('should add a meaningful share of leftover slack when content is sparse', () => {
    const budgetPx = mmToPx(19, DPI)
    const usedStackHeightPx = Math.floor(budgetPx * 0.4)
    const pad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      boxCount: 1,
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
        boxCount: 2,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
    expect(
      computeBodyBoxVerticalPadPx({
        usedStackHeightPx: budgetPx + 40,
        innerHeightMm: 19,
        effectiveDpi: DPI,
        boxCount: 2,
        labelWidthPx: LABEL_WIDTH_PX,
      }),
    ).toBe(BASE_PAD_PX)
  })

  it('should split slack evenly across boxes so total extra padding equals slack', () => {
    const budgetPx = mmToPx(19, DPI)
    const usedStackHeightPx = Math.floor(budgetPx * 0.5)
    const slackPx = budgetPx - usedStackHeightPx
    const boxCount = 3
    const pad = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: 19,
      effectiveDpi: DPI,
      boxCount,
      labelWidthPx: LABEL_WIDTH_PX,
    })
    const extraPerSide = pad - BASE_PAD_PX
    expect(boxCount * extraPerSide * 2).toBeCloseTo(slackPx, 5)
  })
})
