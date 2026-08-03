import type { LabelLayoutMode } from './labelModel'
import type { QrCodeEntry } from './coaLinks'
import type { TestIndicatorEntry } from './testIndicators'
import type { TestIndicatorLayout } from './testIndicatorLayout'

export interface LabelRenderModel {
  readonly wrappedLines: readonly string[]
  readonly titleLines: readonly string[]
  readonly titleFontSizePx: number
  readonly bodyFontSizePx: number
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
}
