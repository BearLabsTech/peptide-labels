import { LABEL_TYPOGRAPHY } from '../labelTypography'
import { BODY_BOX_SLACK_PAD_MAX_MULTIPLE } from '../labelSpacing'
import { mmToPx } from '../../../print/dimensions'

export interface BodyBoxSpacingInput {
  readonly usedStackHeightPx: number
  readonly innerHeightMm: number
  readonly effectiveDpi: number
  /**
   * Number of vertical rows of section boxes (not raw box count).
   * Side-by-side two-box layouts are one row — see {@link bodyBoxRowCount}.
   */
  readonly rowCount: number
  readonly labelWidthPx: number
}

/**
 * Final per-side vertical padding (px) for every `.label-preview-box`,
 * including the base ratio plus a capped share of leftover stack slack.
 *
 * Slack is divided by visual row count (not box count): stacked boxes each
 * own a row; side-by-side boxes share one row. Extra pad is capped at
 * {@link BODY_BOX_SLACK_PAD_MAX_MULTIPLE} × base so tall stock cannot turn
 * leftover height into huge empty guts — that budget stays available for the
 * title↔box gap and title size instead.
 */
export function computeBodyBoxVerticalPadPx(input: BodyBoxSpacingInput): number {
  const basePaddingPx = input.labelWidthPx * (LABEL_TYPOGRAPHY.boxPadVerticalCqw / 100)
  if (input.rowCount === 0) return basePaddingPx

  const budgetPx = mmToPx(input.innerHeightMm, input.effectiveDpi)
  const slackPx = Math.max(0, budgetPx - input.usedStackHeightPx)
  const uncappedExtraPerSidePx = slackPx / (input.rowCount * 2)
  const maxExtraPerSidePx = basePaddingPx * BODY_BOX_SLACK_PAD_MAX_MULTIPLE
  return basePaddingPx + Math.min(uncappedExtraPerSidePx, maxExtraPerSidePx)
}
