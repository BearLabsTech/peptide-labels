import type { LabelModelInput } from '../labelModel'
import { resolveLabelLayoutMode } from '../labelModel'
import type { ResolvedLabelMath } from '../domain/labelMathCore'
import type { LabelRenderModel } from '../labelRenderModel'
import { LabelRenderModelBuilder } from '../LabelRenderModelBuilder'
import {
  LabelLayoutEngine,
  type BoxedSection,
  type LabelLayoutInput,
} from '../LabelLayoutEngine'
import { buildLabelContent } from '../labelContent'
import { buildQrCodes } from '../coaLinks'
import {
  buildTestIndicators,
  hasTestingColumnContent,
  shouldShowCoaQr,
} from '../testIndicators'
import {
  computeSoloTestIndicatorLayout,
  computeTestIndicatorLayout,
  type TestIndicatorLayout,
} from '../testIndicatorLayout'
import {
  computeColumnLayout,
  computeIdentityHeaderTitleBreakout,
  computeIdentityHeaderTitleWidthMm,
  columnsForDenseFullHeightLogo,
  type ColumnLayout,
} from '../labelColumnLayout'
import {
  TITLE_HEIGHT_WEIGHT_DANGER,
  TITLE_HEIGHT_WEIGHT_WITH_BODY,
  IDENTITY_HEADER_TITLE_BAND_GAP_FRAC,
  SPARSE_TITLE_TESTING_GAP_FRAC,
  SPARSE_DANGER_TITLE_HEIGHT_FRAC,
  SPARSE_DANGER_DEMOTED_HEIGHT_FRAC,
  DANGER_BODY_FONT_SCALE,
  SPARSE_LOGO_COLUMN_WIDTH,
  clampColumnWidthPercent,
} from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../../../print/dimensions'
import type { LabelTemplate, LabelTemplateDeps } from './LabelTemplate'
import { TitleBodyFitter } from './TitleBodyFitter'
import { computeBodyBoxVerticalPadPx } from './bodyBoxSpacing'
import {
  bodyBoxesFromContent,
  titleLines,
  type ColumnFeatures,
  type ColumnPlan,
  type FittedLayouts,
  type IndicatorLayoutContext,
  type RenderAssemblyContext,
  type ResolvedContent,
} from './identityHeaderLayout'

/** Bold title (`font-weight: 900`) — measured via TextMeasurer. */
const TITLE_FONT_WEIGHT = 900
const TITLE_WIDTH_FRAC = 0.92
/** Sparse+logo: use more of the center cell — title is the primary read. */
const SPARSE_TITLE_WIDTH_FRAC = 0.98
/** Cap how much of the sparse stack width the horizontal badge row may use. */
const SPARSE_TESTING_WIDTH_FRAC = 0.85
/** Residual width buffer after measured glyphs (not a worst-case letter estimate). */
const TITLE_WIDTH_SAFETY = 0.98

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
  private readonly measurer: LabelTemplateDeps['measurer']

  constructor(deps: LabelTemplateDeps) {
    this.layoutEngine = deps.layoutEngine
    this.printTarget = deps.printTarget
    this.measurer = deps.measurer
    this.titleBodyFitter = new TitleBodyFitter(deps.layoutEngine, deps.printTarget.effectiveDpi, deps.maxFontSizePx)
  }

  render(input: LabelModelInput, resolved: ResolvedLabelMath): LabelRenderModel {
    const content = this.resolveContent(input, resolved)
    const plan = this.layoutColumns(input, content)
    const fitted = this.layoutTitleAndBody(content, plan)
    return this.buildRenderModel({ input, content, plan, fitted })
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
    const features = this.resolveColumnFeatures(input, content)
    const columns = this.resolveColumns(input, features)
    return this.toColumnPlan(features, columns, bodyBoxesFromContent(content))
  }

  protected layoutTitleAndBody(content: ResolvedContent, plan: ColumnPlan): FittedLayouts {
    if (!plan.hasBody) {
      return this.layoutSparseTitle(content, plan)
    }
    return this.layoutTitleWithBody(content, plan)
  }

  protected buildRenderModel(ctx: RenderAssemblyContext): LabelRenderModel {
    const builder = this.seedRenderModelBuilder(ctx)
    return this.finishRenderModel(builder, ctx)
  }

  private resolveColumnFeatures(input: LabelModelInput, content: ResolvedContent): ColumnFeatures {
    const { reconstitutionLines, protocolLines, sourceLines, qrCodes } = content
    // Demoted compound (danger mode) is not a body section — without recon /
    // protocol / source the sticker stays sparse so the center column is not
    // left empty under a 3-column skeleton.
    const hasBody =
      reconstitutionLines.length > 0 ||
      protocolLines.length > 0 ||
      sourceLines.length > 0
    return {
      hasBody,
      isSparse: !hasBody,
      isDanger: !!input.isUntested,
      hasLogo: !!input.customImage,
      hasRightColumn: hasTestingColumnContent(input, qrCodes.length),
      visibleQrCodes: shouldShowCoaQr(input) ? qrCodes : [],
      layoutMode: resolveLabelLayoutMode(input),
    }
  }

  private resolveColumns(input: LabelModelInput, features: ColumnFeatures): ColumnLayout {
    if (features.isSparse) {
      // Sparse: no right-column gutter for title breakout. Logo (if any) uses
      // the generous share; testing/QR live in the title stack, not a side column.
      return computeColumnLayout({
        labelWidthMm: this.printTarget.labelWidthMm,
        paddingMm: this.printTarget.paddingMm,
        hasLogo: features.hasLogo,
        hasQr: false,
        logoColumnWidthPercent: clampColumnWidthPercent(
          input.logoColumnWidthPercent,
          SPARSE_LOGO_COLUMN_WIDTH,
        ),
      })
    }
    return computeColumnLayout({
      labelWidthMm: this.printTarget.labelWidthMm,
      paddingMm: this.printTarget.paddingMm,
      hasLogo: features.hasLogo,
      hasQr: features.hasRightColumn,
      logoColumnWidthPercent: input.logoColumnWidthPercent,
      qrColumnWidthPercent: input.qrColumnWidthPercent,
    })
  }

  private toColumnPlan(
    features: ColumnFeatures,
    columns: ColumnLayout,
    boxes: BoxedSection[],
  ): ColumnPlan {
    const sparseLogoHeightPx = features.isSparse && features.hasLogo
      ? mmToPx(this.usableHeightMm(), this.printTarget.effectiveDpi)
      : 0
    // Sparse with logo: title fits in the remaining center width beside the logo.
    // Dense with logo: title wraps in the primary stack only — logo owns its full-height column.
    // Sparse without logo / dense without logo: full identity-header title width as before.
    const titleWidthMm = features.isSparse && features.hasLogo
      ? columns.centerWidthMm * SPARSE_TITLE_WIDTH_FRAC
      : computeIdentityHeaderTitleWidthMm(
          columns,
          features.isDanger,
          undefined,
          !features.isSparse && features.hasLogo,
        )
    return {
      columns,
      layoutMode: features.layoutMode,
      hasBody: features.hasBody,
      isSparse: features.isSparse,
      isDanger: features.isDanger,
      visibleQrCodes: features.visibleQrCodes,
      baseWidthMm: columns.centerWidthMm * TITLE_WIDTH_FRAC,
      titleWidthMm,
      innerHeightMm: this.usableHeightMm(),
      labelWidthPx: mmToPx(this.printTarget.labelWidthMm, this.printTarget.effectiveDpi),
      titleBodyGapMm: this.printTarget.paddingMm,
      boxes,
      sparseLogoHeightPx,
    }
  }

  private layoutSparseTitle(content: ResolvedContent, plan: ColumnPlan): FittedLayouts {
    const hasTestingBelow =
      content.testIndicators.length > 0 || plan.visibleQrCodes.length > 0
    const demotedTitle = content.demotedTitle

    if (plan.isDanger && demotedTitle) {
      return this.layoutSparseDangerTitle(demotedTitle, content.title, plan, hasTestingBelow)
    }

    // Title stays the primary read. Marks are capped against title size, so
    // give the title nearly the full height budget; leftover strip is enough
    // for the subordinate badge row.
    const titleHeightMm = hasTestingBelow ? plan.innerHeightMm * 0.88 : plan.innerHeightMm
    return this.layoutTitleOnly(content.title, plan, titleHeightMm)
  }

  /**
   * Danger without body sections: DANGER banner on top, demoted compound in the
   * sparse stack (primary product read), optional badges/QR below.
   */
  private layoutSparseDangerTitle(
    demotedTitle: string,
    dangerTitle: string,
    plan: ColumnPlan,
    hasTestingBelow: boolean,
  ): FittedLayouts {
    const titleHeightMm = plan.innerHeightMm * SPARSE_DANGER_TITLE_HEIGHT_FRAC
    const demotedHeightMm = hasTestingBelow
      ? plan.innerHeightMm * SPARSE_DANGER_DEMOTED_HEIGHT_FRAC
      : plan.innerHeightMm * (1 - SPARSE_DANGER_TITLE_HEIGHT_FRAC - 0.06)
    const titleLayout = this.layoutEngine.layout(
      this.titleLayoutInput(dangerTitle, plan, titleHeightMm),
    )
    const demotedLayout = this.layoutEngine.layout(
      this.titleLayoutInput(demotedTitle, plan, demotedHeightMm),
    )
    return {
      kind: 'title-only',
      titleLayout,
      demotedFontSizePx: demotedLayout.fontSizePx,
    }
  }

  private layoutTitleOnly(
    title: string,
    plan: ColumnPlan,
    heightMm: number = plan.innerHeightMm,
  ): FittedLayouts {
    return {
      kind: 'title-only',
      titleLayout: this.layoutEngine.layout(this.titleLayoutInput(title, plan, heightMm)),
    }
  }

  private layoutTitleWithBody(content: ResolvedContent, plan: ColumnPlan): FittedLayouts {
    const titleHeightWeight = plan.isDanger
      ? TITLE_HEIGHT_WEIGHT_DANGER
      : TITLE_HEIGHT_WEIGHT_WITH_BODY
    const { titleLayout, bodyLayout, bodyHeightMm } = this.titleBodyFitter.findBestFit({
      titleInput: this.titleLayoutInput(content.title, plan, plan.innerHeightMm * titleHeightWeight),
      boxes: plan.boxes,
      demotedTitle: content.demotedTitle,
      baseWidthMm: plan.baseWidthMm,
      labelWidthPx: plan.labelWidthPx,
      innerHeightMm: plan.innerHeightMm,
      titleBodyGapMm: plan.titleBodyGapMm,
    })
    const usedStackHeightPx = this.layoutEngine.estimateCenterStackHeightPx(
      titleLayout.wrappedLines.length,
      titleLayout.fontSizePx,
      plan.titleBodyGapMm,
      {
        boxes: plan.boxes,
        demotedLine: content.demotedTitle,
        widthMm: plan.baseWidthMm,
        labelWidthPx: plan.labelWidthPx,
        heightMm: bodyHeightMm,
      },
      bodyLayout.fontSizePx,
    )
    const bodyBoxVerticalPadPx = computeBodyBoxVerticalPadPx({
      usedStackHeightPx,
      innerHeightMm: plan.innerHeightMm,
      effectiveDpi: this.printTarget.effectiveDpi,
      boxCount: plan.boxes.length,
      labelWidthPx: plan.labelWidthPx,
    })
    return { kind: 'title-body', titleLayout, bodyLayout, bodyBoxVerticalPadPx }
  }

  private titleLayoutInput(title: string, plan: ColumnPlan, heightMm: number): LabelLayoutInput {
    return {
      lines: titleLines(title),
      widthMm: plan.titleWidthMm,
      heightMm,
      fontWeight: TITLE_FONT_WEIGHT,
      widthSafety: TITLE_WIDTH_SAFETY,
    }
  }

  private seedRenderModelBuilder(ctx: RenderAssemblyContext): LabelRenderModelBuilder {
    const { input, content, plan, fitted } = ctx
    const { columns, visibleQrCodes } = plan
    const demotedFontSizePx =
      fitted.kind === 'title-only' ? fitted.demotedFontSizePx : undefined
    const testIndicatorLayout = this.buildTestIndicatorLayout({
      testIndicators: content.testIndicators,
      columns,
      visibleQrCodes,
      titleLayout: fitted.titleLayout,
      isSparse: plan.isSparse,
      demotedTitle: content.demotedTitle,
      demotedFontSizePx,
    })
    // Sparse never uses a right-column gutter; breakout treats testing as absent.
    // Dense+logo: logo is a full-height sibling column, so title breakout excludes it.
    const hasQrBreakout = !plan.isSparse && columns.qrWidthMm > 0
    const denseLogoOwnsColumn = !plan.isSparse && columns.logoWidthMm > 0
    const titleBreakoutColumns = denseLogoOwnsColumn
      ? columnsForDenseFullHeightLogo(columns)
      : columns
    const bodyLines = this.displayBodyLines(content, plan, fitted)
    return new LabelRenderModelBuilder()
      .withTitle(content.title, content.demotedTitle)
      .withBodyLines(bodyLines)
      .withQrCodes(visibleQrCodes)
      .withTestIndicators(content.testIndicators, testIndicatorLayout ?? undefined)
      .withCustomImage(input.customImage)
      .withDangerMode(plan.isDanger)
      .withColumnLayout(
        columns,
        computeIdentityHeaderTitleBreakout(
          titleBreakoutColumns,
          !denseLogoOwnsColumn && columns.logoWidthMm > 0,
          hasQrBreakout,
        ),
      )
      .withLabelLayoutMode(plan.layoutMode)
      .withTitleTypography([...fitted.titleLayout.wrappedLines], fitted.titleLayout.fontSizePx)
      .withBodyBoxVerticalPadPx(
        fitted.kind === 'title-body' ? fitted.bodyBoxVerticalPadPx : 0,
      )
      .withSparseComposition(plan.isSparse, plan.sparseLogoHeightPx)
  }

  /**
   * Body section text must use the same wraps as {@link LabelLayoutEngine.layoutBoxedBody}
   * so the preview does not CSS-greedy-wrap authored lines (e.g. orphaning "Den").
   */
  private displayBodyLines(
    content: ResolvedContent,
    plan: ColumnPlan,
    fitted: FittedLayouts,
  ): {
    readonly sourceLines: readonly string[]
    readonly protocolLines: readonly string[]
    readonly reconstitutionLines: readonly string[]
  } {
    if (fitted.kind !== 'title-body') {
      return {
        sourceLines: content.sourceLines,
        protocolLines: content.protocolLines,
        reconstitutionLines: content.reconstitutionLines,
      }
    }
    const wrap = (lines: readonly string[]) =>
      this.layoutEngine.wrapBodySectionLines(lines, plan.baseWidthMm, fitted.bodyLayout.fontSizePx)
    return {
      sourceLines: wrap(content.sourceLines),
      protocolLines: wrap(content.protocolLines),
      reconstitutionLines: wrap(content.reconstitutionLines),
    }
  }

  private finishRenderModel(
    builder: LabelRenderModelBuilder,
    ctx: RenderAssemblyContext,
  ): LabelRenderModel {
    const { fitted, plan } = ctx
    const { titleLayout } = fitted
    if (fitted.kind === 'title-only') {
      return builder
        .withWrappedLines([...titleLayout.wrappedLines])
        .withBodyFontSizePx(fitted.demotedFontSizePx ?? titleLayout.fontSizePx)
        .build()
    }
    return builder
      .withWrappedLines([...titleLayout.wrappedLines, ...fitted.bodyLayout.wrappedLines])
      .withBodyFontSizePx(
        plan.isDanger
          ? fitted.bodyLayout.fontSizePx * DANGER_BODY_FONT_SCALE
          : fitted.bodyLayout.fontSizePx,
      )
      .build()
  }

  private buildTestIndicatorLayout(
    ctx: IndicatorLayoutContext & {
      readonly isSparse: boolean
      readonly demotedTitle?: string
      readonly demotedFontSizePx?: number
    },
  ): TestIndicatorLayout | null {
    const indicatorsHeightMm = this.indicatorsHeightBelowTitle({
      titleLayout: ctx.titleLayout,
      isSparse: ctx.isSparse,
      demotedTitle: ctx.demotedTitle,
      demotedFontSizePx: ctx.demotedFontSizePx,
    })
    if (ctx.isSparse) {
      const availableWidthMm = ctx.columns.centerWidthMm * SPARSE_TESTING_WIDTH_FRAC
      return computeSoloTestIndicatorLayout({
        effectiveDpi: this.printTarget.effectiveDpi,
        availableWidthMm,
        rowCount: ctx.testIndicators.length,
        indicatorsHeightMm,
        labels: ctx.testIndicators.map((entry) => entry.label),
        titleFontSizePx: ctx.demotedFontSizePx ?? ctx.titleLayout.fontSizePx,
        measurer: this.measurer,
      })
    }
    return computeTestIndicatorLayout({
      effectiveDpi: this.printTarget.effectiveDpi,
      labelHeightMm: this.printTarget.labelHeightMm,
      paddingMm: this.printTarget.paddingMm,
      qrColumnWidthMm: ctx.columns.qrWidthMm,
      rowCount: ctx.testIndicators.length,
      qrSharesColumn: ctx.visibleQrCodes.length > 0,
      indicatorsHeightMm,
      labels: ctx.testIndicators.map((entry) => entry.label),
      measurer: this.measurer,
    })
  }

  private indicatorsHeightBelowTitle(ctx: {
    readonly titleLayout: {
      readonly wrappedLines: readonly string[]
      readonly fontSizePx: number
    }
    readonly isSparse: boolean
    readonly demotedTitle?: string
    readonly demotedFontSizePx?: number
  }): number {
    const innerHeightMm = this.usableHeightMm()
    const titlePx = this.layoutEngine.estimateTitleHeightPx(
      ctx.titleLayout.wrappedLines.length,
      ctx.titleLayout.fontSizePx,
    )
    const gapFrac = ctx.isSparse ? SPARSE_TITLE_TESTING_GAP_FRAC : IDENTITY_HEADER_TITLE_BAND_GAP_FRAC
    const padPx = mmToPx(this.printTarget.paddingMm, this.printTarget.effectiveDpi)
    const gapPx = padPx * gapFrac
    let demotedPx = 0
    if (ctx.demotedTitle && ctx.demotedFontSizePx) {
      const demotedLines = titleLines(ctx.demotedTitle).length
      demotedPx =
        this.layoutEngine.estimateTitleHeightPx(demotedLines, ctx.demotedFontSizePx) + gapPx
    }
    const rowPx = Math.max(
      0,
      mmToPx(innerHeightMm, this.printTarget.effectiveDpi) - titlePx - gapPx - demotedPx,
    )
    return pxToMm(rowPx, this.printTarget.effectiveDpi)
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - this.printTarget.paddingMm * 2
  }
}
