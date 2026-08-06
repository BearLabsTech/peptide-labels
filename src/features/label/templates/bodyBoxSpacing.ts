import { LABEL_TYPOGRAPHY } from '../labelTypography'
import { mmToPx } from '../../../print/dimensions'

export interface BodyBoxSpacingInput {
  readonly usedStackHeightPx: number
  readonly innerHeightMm: number
  readonly effectiveDpi: number
  readonly boxCount: number
  readonly labelWidthPx: number
}

/**
 * Final per-side vertical padding (px) for every `.label-preview-box`,
 * including the base ratio plus this box's even share of whatever vertical
 * space the title+body fit left unused. Slack is `budget - used`, so
 * distributing all of it back as padding can never overflow the label —
 * no separate cap is needed.
 */
export function computeBodyBoxVerticalPadPx(input: BodyBoxSpacingInput): number {
  const basePaddingPx = input.labelWidthPx * (LABEL_TYPOGRAPHY.boxPadVerticalCqw / 100)
  if (input.boxCount === 0) return basePaddingPx

  const budgetPx = mmToPx(input.innerHeightMm, input.effectiveDpi)
  const slackPx = Math.max(0, budgetPx - input.usedStackHeightPx)
  const extraPerBoxPx = slackPx / input.boxCount
  return basePaddingPx + extraPerBoxPx / 2
}
