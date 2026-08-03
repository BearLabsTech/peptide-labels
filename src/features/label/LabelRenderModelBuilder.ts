import type { LabelLayoutMode } from './labelModel'
import type { QrCodeEntry } from './coaLinks'
import type { TestIndicatorEntry } from './testIndicators'
import type { TestIndicatorLayout } from './testIndicatorLayout'
import type { LabelRenderModel } from './labelRenderModel'

/**
 * Fluent builder for {@link LabelRenderModel}. Shared fields are set once;
 * the title-only and title+body paths differ only in wrapped lines and
 * body font size.
 */
export class LabelRenderModelBuilder {
  private title = ''
  private demotedTitle: string | undefined
  private sourceLines: readonly string[] = []
  private protocolLines: readonly string[] = []
  private reconstitutionLines: readonly string[] = []
  private qrCodes: readonly QrCodeEntry[] = []
  private testIndicators: readonly TestIndicatorEntry[] = []
  private testIndicatorLayout: TestIndicatorLayout | undefined
  private customImage: string | undefined
  private isDangerMode = false
  private logoColumnWidthPercent = 0
  private qrColumnWidthPercent = 0
  private labelLayoutMode: LabelLayoutMode = 'identityHeader'
  private titleLines: readonly string[] = []
  private titleFontSizePx = 0
  private wrappedLines: readonly string[] = []
  private bodyFontSizePx = 0

  withTitle(title: string, demotedTitle?: string): this {
    this.title = title
    this.demotedTitle = demotedTitle
    return this
  }

  withBodyLines(input: {
    readonly sourceLines: readonly string[]
    readonly protocolLines: readonly string[]
    readonly reconstitutionLines: readonly string[]
  }): this {
    this.sourceLines = input.sourceLines
    this.protocolLines = input.protocolLines
    this.reconstitutionLines = input.reconstitutionLines
    return this
  }

  withQrCodes(qrCodes: readonly QrCodeEntry[]): this {
    this.qrCodes = qrCodes
    return this
  }

  withTestIndicators(
    testIndicators: readonly TestIndicatorEntry[],
    testIndicatorLayout?: TestIndicatorLayout,
  ): this {
    this.testIndicators = testIndicators
    this.testIndicatorLayout = testIndicatorLayout
    return this
  }

  withCustomImage(customImage: string | undefined): this {
    this.customImage = customImage
    return this
  }

  withDangerMode(isDangerMode: boolean): this {
    this.isDangerMode = isDangerMode
    return this
  }

  withColumnPercents(logoColumnWidthPercent: number, qrColumnWidthPercent: number): this {
    this.logoColumnWidthPercent = logoColumnWidthPercent
    this.qrColumnWidthPercent = qrColumnWidthPercent
    return this
  }

  withLabelLayoutMode(labelLayoutMode: LabelLayoutMode): this {
    this.labelLayoutMode = labelLayoutMode
    return this
  }

  withTitleTypography(titleLines: readonly string[], titleFontSizePx: number): this {
    this.titleLines = titleLines
    this.titleFontSizePx = titleFontSizePx
    return this
  }

  withWrappedLines(wrappedLines: readonly string[]): this {
    this.wrappedLines = wrappedLines
    return this
  }

  withBodyFontSizePx(bodyFontSizePx: number): this {
    this.bodyFontSizePx = bodyFontSizePx
    return this
  }

  build(): LabelRenderModel {
    return {
      wrappedLines: this.wrappedLines,
      titleLines: this.titleLines,
      titleFontSizePx: this.titleFontSizePx,
      bodyFontSizePx: this.bodyFontSizePx,
      title: this.title,
      demotedTitle: this.demotedTitle,
      sourceLines: this.sourceLines,
      protocolLines: this.protocolLines,
      reconstitutionLines: this.reconstitutionLines,
      qrCodes: this.qrCodes,
      testIndicators: this.testIndicators,
      testIndicatorLayout: this.testIndicatorLayout,
      customImage: this.customImage,
      isDangerMode: this.isDangerMode,
      logoColumnWidthPercent: this.logoColumnWidthPercent,
      qrColumnWidthPercent: this.qrColumnWidthPercent,
      labelLayoutMode: this.labelLayoutMode,
    }
  }
}
