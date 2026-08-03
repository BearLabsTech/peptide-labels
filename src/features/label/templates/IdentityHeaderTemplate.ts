import type { LabelModelInput } from '../labelModel'
import { resolveLabelLayoutMode } from '../labelModel'
import type { ResolvedLabelMath } from '../domain/labelMathCore'
import type { LabelRenderModel } from '../labelRenderModel'
import {
  LabelLayoutEngine,
  type BoxedSection,
  type LabelLayoutInput,
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
import { computeColumnLayout, computeIdentityHeaderTitleWidthMm } from '../labelColumnLayout'
import {
  MIN_TITLE_TO_BODY_FONT_RATIO,
  TITLE_HEIGHT_WEIGHT_DANGER,
  TITLE_HEIGHT_WEIGHT_WITH_BODY,
  IDENTITY_HEADER_TITLE_BAND_GAP_FRAC,
  MIN_FONT_SIZE_PX,
  DANGER_BODY_FONT_SCALE,
} from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../print/dimensions'
import type { LabelTemplate, LabelTemplateDeps } from './LabelTemplate'

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
 */
export class IdentityHeaderTemplate implements LabelTemplate {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly printTarget: LabelTemplateDeps['printTarget']
  private readonly maxFontSizePx: number

  constructor(deps: LabelTemplateDeps) {
    this.layoutEngine = deps.layoutEngine
    this.printTarget = deps.printTarget
    this.maxFontSizePx = deps.maxFontSizePx
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
    const { titleLayout, bodyLayout } = this.fitTitleAndBodyLayouts({
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

    if (fitted.kind === 'title-only') {
      const { titleLayout } = fitted
      const testIndicatorLayout = this.buildTestIndicatorLayout(
        testIndicators, columns, visibleQrCodes, titleLayout,
      )
      return {
        wrappedLines: [...titleLayout.wrappedLines],
        titleLines: [...titleLayout.wrappedLines],
        titleFontSizePx: titleLayout.fontSizePx,
        bodyFontSizePx: titleLayout.fontSizePx,
        title, demotedTitle, sourceLines: srcLines, protocolLines: proLines, reconstitutionLines: recLines,
        qrCodes: visibleQrCodes, testIndicators, testIndicatorLayout, customImage: input.customImage, isDangerMode: isDanger,
        logoColumnWidthPercent: columns.logoWidthPercent,
        qrColumnWidthPercent: columns.qrWidthPercent,
        labelLayoutMode: layoutMode,
      }
    }

    const { titleLayout, bodyLayout } = fitted
    const testIndicatorLayout = this.buildTestIndicatorLayout(
      testIndicators, columns, visibleQrCodes, titleLayout,
    )
    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleLines: [...titleLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: isDanger ? (bodyLayout.fontSizePx * DANGER_BODY_FONT_SCALE) : bodyLayout.fontSizePx,
      title, demotedTitle, sourceLines: srcLines, protocolLines: proLines, reconstitutionLines: recLines,
      qrCodes: visibleQrCodes, testIndicators, testIndicatorLayout, customImage: input.customImage, isDangerMode: isDanger,
      logoColumnWidthPercent: columns.logoWidthPercent,
      qrColumnWidthPercent: columns.qrWidthPercent,
      labelLayoutMode: layoutMode,
    }
  }

  private fitTitleAndBodyLayouts(params: {
    titleInput: LabelLayoutInput
    boxes: BoxedSection[]
    demotedTitle?: string
    baseWidthMm: number
    labelWidthPx: number
    innerHeightMm: number
    titleBodyGapMm: number
  }): { titleLayout: LabelLayoutResult; bodyLayout: LabelLayoutResult } {
    const {
      titleInput,
      boxes,
      demotedTitle,
      baseWidthMm,
      labelWidthPx,
      innerHeightMm,
      titleBodyGapMm,
    } = params
    let titleLayout = this.layoutEngine.layout(titleInput)
    const innerPx = mmToPx(innerHeightMm, this.printTarget.effectiveDpi)
    const bodyInputBase = {
      boxes,
      demotedLine: demotedTitle,
      widthMm: baseWidthMm,
      labelWidthPx,
    }
    const layoutBodyAtFont = (bodyHeightMm: number, bodyFontPx: number): LabelLayoutResult => ({
      fontSizePx: bodyFontPx,
      wrappedLines: this.layoutEngine.layoutBoxedBody({
        ...bodyInputBase,
        heightMm: bodyHeightMm,
      }).wrappedLines,
    })
    const stackFits = (
      titleAttempt: LabelLayoutResult,
      bodyAttempt: LabelLayoutResult,
      bodyHeightMm: number,
    ) => (
      this.layoutEngine.sectionLabelsFitBoxWidth(baseWidthMm, bodyAttempt.fontSizePx)
      && this.layoutEngine.estimateCenterStackHeightPx(
        titleAttempt.wrappedLines.length,
        titleAttempt.fontSizePx,
        titleBodyGapMm,
        { ...bodyInputBase, heightMm: bodyHeightMm },
        bodyAttempt.fontSizePx,
      ) <= innerPx
    )

    let bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleLayout, titleBodyGapMm)
    let bodyLayout = this.layoutEngine.layoutBoxedBody({
      ...bodyInputBase,
      heightMm: bodyHeightMm,
    })

    for (let bodyFont = bodyLayout.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
      const attempt = layoutBodyAtFont(bodyHeightMm, bodyFont)
      bodyLayout = attempt
      if (stackFits(titleLayout, attempt, bodyHeightMm)) break
    }

    if (!stackFits(titleLayout, bodyLayout, bodyHeightMm)) {
      for (let titleFont = titleLayout.fontSizePx - 1; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
        const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont)
        if (!titleAttempt) continue
        bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm)
        const refitBody = this.layoutEngine.layoutBoxedBody({
          ...bodyInputBase,
          heightMm: bodyHeightMm,
        })
        for (let bodyFont = refitBody.fontSizePx; bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
          const attempt = layoutBodyAtFont(bodyHeightMm, bodyFont)
          titleLayout = titleAttempt
          bodyLayout = attempt
          if (stackFits(titleAttempt, attempt, bodyHeightMm)) break
        }
        if (stackFits(titleLayout, bodyLayout, bodyHeightMm)) break
      }
    }

    const boosted = this.boostTitleRelativeToBody({
      titleInput,
      titleLayout,
      bodyLayout,
      bodyHeightMm,
      innerHeightMm,
      titleBodyGapMm,
      layoutBodyAtFont,
      stackFits,
    })
    return {
      titleLayout: boosted.titleLayout,
      bodyLayout: boosted.bodyLayout,
    }
  }

  private boostTitleRelativeToBody(params: {
    titleInput: LabelLayoutInput
    titleLayout: LabelLayoutResult
    bodyLayout: LabelLayoutResult
    bodyHeightMm: number
    innerHeightMm: number
    titleBodyGapMm: number
    layoutBodyAtFont: (bodyHeightMm: number, bodyFontPx: number) => LabelLayoutResult
    stackFits: (
      tLayout: LabelLayoutResult,
      bLayout: LabelLayoutResult,
      bodyHeightMm: number,
    ) => boolean
  }): {
    titleLayout: LabelLayoutResult
    bodyLayout: LabelLayoutResult
    bodyHeightMm: number
  } {
    const {
      titleInput,
      titleLayout,
      bodyLayout,
      bodyHeightMm,
      innerHeightMm,
      titleBodyGapMm,
      layoutBodyAtFont,
      stackFits,
    } = params

    if (titleLayout.fontSizePx >= bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO) {
      return { titleLayout, bodyLayout, bodyHeightMm }
    }

    for (let titleFont = this.maxFontSizePx; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont)
      if (!titleAttempt) continue

      const attemptBodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm)
      const maxBodyFont = Math.floor(titleFont / MIN_TITLE_TO_BODY_FONT_RATIO)

      for (let bodyFont = Math.min(maxBodyFont, bodyLayout.fontSizePx); bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
        const bodyAttempt = layoutBodyAtFont(attemptBodyHeightMm, bodyFont)
        if (stackFits(titleAttempt, bodyAttempt, attemptBodyHeightMm)) {
          return { titleLayout: titleAttempt, bodyLayout: bodyAttempt, bodyHeightMm: attemptBodyHeightMm }
        }
      }
    }

    return { titleLayout, bodyLayout, bodyHeightMm }
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

  private remainingBodyHeightMm(
    innerHeightMm: number,
    titleLayout: { wrappedLines: readonly string[]; fontSizePx: number },
    titleBodyGapMm: number,
  ): number {
    const innerPx = mmToPx(innerHeightMm, this.printTarget.effectiveDpi)
    const titlePx = this.layoutEngine.estimateTitleHeightPx(titleLayout.wrappedLines.length, titleLayout.fontSizePx)
    const gapPx = mmToPx(titleBodyGapMm, this.printTarget.effectiveDpi)
    const remainingPx = Math.max(0, innerPx - titlePx - gapPx)
    return pxToMm(remainingPx, this.printTarget.effectiveDpi)
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - (this.printTarget.paddingMm * 2)
  }
}
