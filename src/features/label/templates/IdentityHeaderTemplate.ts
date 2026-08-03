import type { LabelModelInput } from '../labelModel'
import { resolveLabelLayoutMode } from '../labelModel'
import type { ResolvedLabelMath } from '../domain/labelMathCore'
import type { LabelRenderModel } from '../labelRenderModel'
import { LabelRenderModelBuilder } from '../LabelRenderModelBuilder'
import {
  LabelLayoutEngine,
  type BoxedSection,
  type LabelLayoutResult,
} from '../LabelLayoutEngine'
import { buildLabelContent } from '../labelContent'
import { buildQrCodes, type QrCodeEntry } from '../coaLinks'
import {
  buildTestIndicators,
  hasTestingColumnContent,
  shouldShowCoaQr,
  type TestIndicatorEntry,
} from '../testIndicators'
import { computeTestIndicatorLayout, type TestIndicatorLayout } from '../testIndicatorLayout'
import { computeColumnLayout, computeIdentityHeaderTitleBreakout, computeIdentityHeaderTitleWidthMm } from '../labelColumnLayout'
import {
  TITLE_HEIGHT_WEIGHT_DANGER,
  TITLE_HEIGHT_WEIGHT_WITH_BODY,
  IDENTITY_HEADER_TITLE_BAND_GAP_FRAC,
  DANGER_BODY_FONT_SCALE,
} from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../print/dimensions'
import type { LabelTemplate, LabelTemplateDeps } from './LabelTemplate'
import { TitleBodyFitter } from './TitleBodyFitter'

/** Bold uppercase title (`font-weight: 900`) — Arial caps run ~0.95em per character. */
const TITLE_CHAR_WIDTH_EM = 0.95
const TITLE_WIDTH_FRAC = 0.92

type ResolvedContent = {
  readonly title: string
  readonly demotedTitle: string | undefined
  readonly sourceLines: readonly string[]
  readonly reconstitutionLines: readonly string[]
  readonly protocolLines: readonly string[]
  readonly qrCodes: readonly QrCodeEntry[]
  readonly testIndicators: readonly TestIndicatorEntry[]
}

type ColumnPlan = {
  readonly columns: ReturnType<typeof computeColumnLayout>
  readonly layoutMode: ReturnType<typeof resolveLabelLayoutMode>
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

type FittedLayouts =
  | { readonly kind: 'title-only'; readonly titleLayout: LabelLayoutResult }
  | {
      readonly kind: 'title-body'
      readonly titleLayout: LabelLayoutResult
      readonly bodyLayout: LabelLayoutResult
    }

/**
 * Shipped identity-header layout. Implements the {@link LabelTemplate}
 * Template Method skeleton; step bodies are the former `LabelComposer`
 * private methods moved here unchanged so goldens stay byte-identical.
 * The title/body font-fitting search itself is delegated to {@link TitleBodyFitter}.
 */
export class IdentityHeaderTemplate implements LabelTemplate {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly printTarget: LabelTemplateDeps['printTarget']
  private readonly titleBodyFitter: TitleBodyFitter

  constructor(deps: LabelTemplateDeps) {
    this.layoutEngine = deps.layoutEngine
    this.printTarget = deps.printTarget
    this.titleBodyFitter = new TitleBodyFitter(deps.layoutEngine, deps.printTarget.effectiveDpi, deps.maxFontSizePx)
  }

  render(input: LabelModelInput, resolved: ResolvedLabelMath): LabelRenderModel {
    const content = this.resolveContent(input, resolved)
    const columns = this.layoutColumns(input, content)
    const fitted = this.layoutTitleAndBody(input, content, columns)
    return this.buildRenderModel(input, content, columns, fitted)
  }

  protected resolveContent(input: LabelModelInput, resolved: ResolvedLabelMath): ResolvedContent {
    const {
      title,
      demotedTitle,
      sourceLines,
      reconstitutionLines,
      protocolLines,
    } = buildLabelContent(input, resolved)
    return {
      title,
      demotedTitle,
      sourceLines,
      reconstitutionLines,
      protocolLines,
      qrCodes: buildQrCodes(input),
      testIndicators: buildTestIndicators(input),
    }
  }

  protected layoutColumns(input: LabelModelInput, content: ResolvedContent): ColumnPlan {
    const { reconstitutionLines: recLines, protocolLines: proLines, sourceLines: srcLines, demotedTitle, qrCodes } = content
    const hasBody = recLines.length > 0 || proLines.length > 0 || srcLines.length > 0 || !!demotedTitle
    const isDanger = !!input.isUntested
    const hasLogo = !!input.customImage
    const showCoaQr = shouldShowCoaQr(input)
    const visibleQrCodes = showCoaQr ? qrCodes : []
    const hasRightColumn = hasTestingColumnContent(input, qrCodes.length)
    const columns = computeColumnLayout({
      labelWidthMm: this.printTarget.labelWidthMm,
      paddingMm: this.printTarget.paddingMm,
      hasLogo,
      hasQr: hasRightColumn,
      logoColumnWidthPercent: input.logoColumnWidthPercent,
      qrColumnWidthPercent: input.qrColumnWidthPercent,
    })
    return {
      columns,
      layoutMode: resolveLabelLayoutMode(input),
      hasBody,
      isDanger,
      visibleQrCodes,
      baseWidthMm: columns.centerWidthMm * TITLE_WIDTH_FRAC,
      titleWidthMm: computeIdentityHeaderTitleWidthMm(columns, isDanger),
      titleWidthSafety: 1,
      innerHeightMm: this.usableHeightMm(),
      labelWidthPx: mmToPx(this.printTarget.labelWidthMm, this.printTarget.effectiveDpi),
      titleBodyGapMm: this.printTarget.paddingMm,
      boxes: [
        ...(recLines.length > 0 ? [{ lines: recLines }] : []),
        ...(proLines.length > 0 ? [{ lines: proLines }] : []),
        ...(srcLines.length > 0 ? [{ lines: srcLines }] : []),
      ],
    }
  }

  protected layoutTitleAndBody(
    _input: LabelModelInput,
    content: ResolvedContent,
    plan: ColumnPlan,
  ): FittedLayouts {
    const { title, demotedTitle } = content
    const {
      hasBody,
      isDanger,
      titleWidthMm,
      titleWidthSafety,
      innerHeightMm,
      baseWidthMm,
      labelWidthPx,
      titleBodyGapMm,
      boxes,
    } = plan

    if (!hasBody) {
      return {
        kind: 'title-only',
        titleLayout: this.layoutEngine.layout({
          lines: title.split('\n').map((line) => line.toUpperCase()),
          widthMm: titleWidthMm,
          heightMm: innerHeightMm,
          charWidthEm: TITLE_CHAR_WIDTH_EM,
          widthSafety: titleWidthSafety,
        }),
      }
    }

    const titleHeightWeight = isDanger
      ? TITLE_HEIGHT_WEIGHT_DANGER
      : TITLE_HEIGHT_WEIGHT_WITH_BODY
    const titleInput = {
      lines: title.split('\n').map((line) => line.toUpperCase()),
      widthMm: titleWidthMm,
      heightMm: innerHeightMm * titleHeightWeight,
      charWidthEm: TITLE_CHAR_WIDTH_EM,
      widthSafety: titleWidthSafety,
    }
    const { titleLayout, bodyLayout } = this.titleBodyFitter.findBestFit({
      titleInput,
      boxes,
      demotedTitle,
      baseWidthMm,
      labelWidthPx,
      innerHeightMm,
      titleBodyGapMm,
    })
    return { kind: 'title-body', titleLayout, bodyLayout }
  }

  protected buildRenderModel(
    input: LabelModelInput,
    content: ResolvedContent,
    plan: ColumnPlan,
    fitted: FittedLayouts,
  ): LabelRenderModel {
    const {
      title,
      demotedTitle,
      sourceLines: srcLines,
      reconstitutionLines: recLines,
      protocolLines: proLines,
      testIndicators,
    } = content
    const {
      columns,
      layoutMode,
      isDanger,
      visibleQrCodes,
    } = plan

    const titleLayout = fitted.titleLayout
    const testIndicatorLayout = this.buildTestIndicatorLayout(
      testIndicators, columns, visibleQrCodes, titleLayout,
    )
    const identityHeaderTitleBreakout = computeIdentityHeaderTitleBreakout(
      columns,
      columns.logoWidthMm > 0,
      columns.qrWidthMm > 0,
    )
    const builder = new LabelRenderModelBuilder()
      .withTitle(title, demotedTitle)
      .withBodyLines({
        sourceLines: srcLines,
        protocolLines: proLines,
        reconstitutionLines: recLines,
      })
      .withQrCodes(visibleQrCodes)
      .withTestIndicators(testIndicators, testIndicatorLayout)
      .withCustomImage(input.customImage)
      .withDangerMode(isDanger)
      .withColumnLayout(columns, identityHeaderTitleBreakout)
      .withLabelLayoutMode(layoutMode)
      .withTitleTypography([...titleLayout.wrappedLines], titleLayout.fontSizePx)

    if (fitted.kind === 'title-only') {
      return builder
        .withWrappedLines([...titleLayout.wrappedLines])
        .withBodyFontSizePx(titleLayout.fontSizePx)
        .build()
    }

    const { bodyLayout } = fitted
    return builder
      .withWrappedLines([...titleLayout.wrappedLines, ...bodyLayout.wrappedLines])
      .withBodyFontSizePx(
        isDanger ? bodyLayout.fontSizePx * DANGER_BODY_FONT_SCALE : bodyLayout.fontSizePx,
      )
      .build()
  }

  private buildTestIndicatorLayout(
    testIndicators: readonly TestIndicatorEntry[],
    columns: ReturnType<typeof computeColumnLayout>,
    visibleQrCodes: readonly QrCodeEntry[],
    titleLayout?: { wrappedLines: readonly string[]; fontSizePx: number },
  ): TestIndicatorLayout | undefined {
    const innerHeightMm = this.usableHeightMm()
    let indicatorsHeightMm = innerHeightMm
    if (titleLayout) {
      const titlePx = this.layoutEngine.estimateTitleHeightPx(
        titleLayout.wrappedLines.length,
        titleLayout.fontSizePx,
      )
      const gapPx = mmToPx(this.printTarget.paddingMm, this.printTarget.effectiveDpi) * IDENTITY_HEADER_TITLE_BAND_GAP_FRAC
      const rowPx = Math.max(0, mmToPx(innerHeightMm, this.printTarget.effectiveDpi) - titlePx - gapPx)
      indicatorsHeightMm = pxToMm(rowPx, this.printTarget.effectiveDpi)
    }

    return computeTestIndicatorLayout({
      effectiveDpi: this.printTarget.effectiveDpi,
      labelHeightMm: this.printTarget.labelHeightMm,
      paddingMm: this.printTarget.paddingMm,
      qrColumnWidthMm: columns.qrWidthMm,
      rowCount: testIndicators.length,
      qrSharesColumn: visibleQrCodes.length > 0,
      indicatorsHeightMm,
      labels: testIndicators.map((entry) => entry.label),
    })
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - (this.printTarget.paddingMm * 2)
  }
}
