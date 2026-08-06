import type { LabelLayoutMode } from './labelModel'
import type { QrCodeEntry } from './coaLinks'
import type { TestIndicatorEntry } from './testIndicators'
import type { TestIndicatorLayout } from './testIndicatorLayout'
import type { ColumnLayout, IdentityHeaderTitleBreakout } from './labelColumnLayout'

export interface LabelRenderModel {
  readonly wrappedLines: readonly string[]
  readonly titleLines: readonly string[]
  readonly titleFontSizePx: number
  readonly bodyFontSizePx: number
  /** Per-side vertical padding (export px) for each `.label-preview-box`. */
  readonly bodyBoxVerticalPadPx: number
  readonly title: string
  readonly demotedTitle?: string
  readonly protocolLines: readonly string[]
  readonly reconstitutionLines: readonly string[]
  readonly sourceLines: readonly string[]
  readonly qrCodes: readonly QrCodeEntry[]
  readonly customImage?: string
  readonly isDangerMode: boolean
  readonly testIndicators: readonly TestIndicatorEntry[]
  readonly testIndicatorLayout?: TestIndicatorLayout
  readonly logoColumnWidthPercent: number
  readonly qrColumnWidthPercent: number
  readonly labelLayoutMode: LabelLayoutMode
  /**
   * True when there are no body sections — preview uses the centered sparse
   * composition instead of the three-column dense row.
   */
  readonly isSparse: boolean
  /**
   * Explicit logo box height (export px) for sparse composition. Zero when
   * dense or when no logo is present.
   */
  readonly sparseLogoHeightPx: number
  /** Resolved three-column geometry from composition — preview must not recompute. */
  readonly columnLayout: ColumnLayout
  /** Identity-header title breakout CSS fractions derived from {@link columnLayout}. */
  readonly identityHeaderTitleBreakout: IdentityHeaderTitleBreakout
}
