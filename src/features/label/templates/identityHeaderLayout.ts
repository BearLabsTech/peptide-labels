import type { LabelModelInput } from '../labelModel'
import type { LabelLayoutMode } from '../labelModel'
import type { LabelLayoutResult } from '../LabelLayoutEngine'
import type { BoxedSection } from '../LabelLayoutEngine'
import type { QrCodeEntry } from '../coaLinks'
import type { TestIndicatorEntry } from '../testIndicators'
import type { ColumnLayout } from '../labelColumnLayout'

export type ResolvedContent = {
  readonly title: string
  readonly demotedTitle: string | undefined
  readonly sourceLines: readonly string[]
  readonly reconstitutionLines: readonly string[]
  readonly protocolLines: readonly string[]
  readonly qrCodes: readonly QrCodeEntry[]
  readonly testIndicators: readonly TestIndicatorEntry[]
}

export type ColumnFeatures = {
  readonly hasBody: boolean
  readonly isDanger: boolean
  readonly hasLogo: boolean
  readonly hasRightColumn: boolean
  readonly visibleQrCodes: readonly QrCodeEntry[]
  readonly layoutMode: LabelLayoutMode
}

export type ColumnPlan = {
  readonly columns: ColumnLayout
  readonly layoutMode: LabelLayoutMode
  readonly hasBody: boolean
  readonly isDanger: boolean
  readonly visibleQrCodes: readonly QrCodeEntry[]
  readonly baseWidthMm: number
  readonly titleWidthMm: number
  readonly titleWidthSafety: number
  readonly innerHeightMm: number
  readonly labelWidthPx: number
  readonly titleBodyGapMm: number
  readonly boxes: BoxedSection[]
}

export type FittedLayouts =
  | { readonly kind: 'title-only'; readonly titleLayout: LabelLayoutResult }
  | {
      readonly kind: 'title-body'
      readonly titleLayout: LabelLayoutResult
      readonly bodyLayout: LabelLayoutResult
    }

/** Shared inputs for the final render-model assembly step. */
export type RenderAssemblyContext = {
  readonly input: LabelModelInput
  readonly content: ResolvedContent
  readonly plan: ColumnPlan
  readonly fitted: FittedLayouts
}

export type IndicatorLayoutContext = {
  readonly testIndicators: readonly TestIndicatorEntry[]
  readonly columns: ColumnLayout
  readonly visibleQrCodes: readonly QrCodeEntry[]
  readonly titleLayout: { readonly wrappedLines: readonly string[]; readonly fontSizePx: number }
}

export function titleLinesUpper(title: string): string[] {
  return title.split('\n').map((line) => line.toUpperCase())
}

export function bodyBoxesFromContent(content: ResolvedContent): BoxedSection[] {
  const { reconstitutionLines, protocolLines, sourceLines } = content
  return [
    ...(reconstitutionLines.length > 0 ? [{ lines: reconstitutionLines }] : []),
    ...(protocolLines.length > 0 ? [{ lines: protocolLines }] : []),
    ...(sourceLines.length > 0 ? [{ lines: sourceLines }] : []),
  ]
}
