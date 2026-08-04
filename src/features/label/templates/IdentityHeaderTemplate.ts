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
import { computeTestIndicatorLayout, type TestIndicatorLayout } from '../testIndicatorLayout'
import {
  computeColumnLayout,
  computeIdentityHeaderTitleBreakout,
  computeIdentityHeaderTitleWidthMm,
  type ColumnLayout,
} from '../labelColumnLayout'
import {
  TITLE_HEIGHT_WEIGHT_DANGER,
  TITLE_HEIGHT_WEIGHT_WITH_BODY,
  IDENTITY_HEADER_TITLE_BAND_GAP_FRAC,
  DANGER_BODY_FONT_SCALE,
} from '../labelLayoutConstants'
import { mmToPx, pxToMm } from '../../../print/dimensions'
import type { LabelTemplate, LabelTemplateDeps } from './LabelTemplate'
import { TitleBodyFitter } from './TitleBodyFitter'
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

/** Bold uppercase title (`font-weight: 900`) — Arial caps run ~0.95em per character. */
const TITLE_CHAR_WIDTH_EM = 0.95
const TITLE_WIDTH_FRAC = 0.92

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
    const columns = computeColumnLayout({
      labelWidthMm: this.printTarget.labelWidthMm,
      paddingMm: this.printTarget.paddingMm,
      hasLogo: features.hasLogo,
      hasQr: features.hasRightColumn,
      logoColumnWidthPercent: input.logoColumnWidthPercent,
      qrColumnWidthPercent: input.qrColumnWidthPercent,
    })
    return this.toColumnPlan(features, columns, bodyBoxesFromContent(content))
  }

  protected layoutTitleAndBody(content: ResolvedContent, plan: ColumnPlan): FittedLayouts {
    if (!plan.hasBody) {
      return this.layoutTitleOnly(content.title, plan)
    }
    return this.layoutTitleWithBody(content, plan)
  }

  protected buildRenderModel(ctx: RenderAssemblyContext): LabelRenderModel {
    const builder = this.seedRenderModelBuilder(ctx)
    return this.finishRenderModel(builder, ctx)
  }

  private resolveColumnFeatures(input: LabelModelInput, content: ResolvedContent): ColumnFeatures {
    const { reconstitutionLines, protocolLines, sourceLines, demotedTitle, qrCodes } = content
    const hasBody =
      reconstitutionLines.length > 0 ||
      protocolLines.length > 0 ||
      sourceLines.length > 0 ||
      !!demotedTitle
    return {
      hasBody,
      isDanger: !!input.isUntested,
      hasLogo: !!input.customImage,
      hasRightColumn: hasTestingColumnContent(input, qrCodes.length),
      visibleQrCodes: shouldShowCoaQr(input) ? qrCodes : [],
      layoutMode: resolveLabelLayoutMode(input),
    }
  }

  private toColumnPlan(
    features: ColumnFeatures,
    columns: ColumnLayout,
    boxes: BoxedSection[],
  ): ColumnPlan {
    return {
      columns,
      layoutMode: features.layoutMode,
      hasBody: features.hasBody,
      isDanger: features.isDanger,
      visibleQrCodes: features.visibleQrCodes,
      baseWidthMm: columns.centerWidthMm * TITLE_WIDTH_FRAC,
      titleWidthMm: computeIdentityHeaderTitleWidthMm(columns, features.isDanger),
      titleWidthSafety: 1,
      innerHeightMm: this.usableHeightMm(),
      labelWidthPx: mmToPx(this.printTarget.labelWidthMm, this.printTarget.effectiveDpi),
      titleBodyGapMm: this.printTarget.paddingMm,
      boxes,
    }
  }

  private layoutTitleOnly(title: string, plan: ColumnPlan): FittedLayouts {
    return {
      kind: 'title-only',
      titleLayout: this.layoutEngine.layout(this.titleLayoutInput(title, plan, plan.innerHeightMm)),
    }
  }

  private layoutTitleWithBody(content: ResolvedContent, plan: ColumnPlan): FittedLayouts {
    const titleHeightWeight = plan.isDanger
      ? TITLE_HEIGHT_WEIGHT_DANGER
      : TITLE_HEIGHT_WEIGHT_WITH_BODY
    const { titleLayout, bodyLayout } = this.titleBodyFitter.findBestFit({
      titleInput: this.titleLayoutInput(content.title, plan, plan.innerHeightMm * titleHeightWeight),
      boxes: plan.boxes,
      demotedTitle: content.demotedTitle,
      baseWidthMm: plan.baseWidthMm,
      labelWidthPx: plan.labelWidthPx,
      innerHeightMm: plan.innerHeightMm,
      titleBodyGapMm: plan.titleBodyGapMm,
    })
    return { kind: 'title-body', titleLayout, bodyLayout }
  }

  private titleLayoutInput(title: string, plan: ColumnPlan, heightMm: number): LabelLayoutInput {
    return {
      lines: titleLines(title),
      widthMm: plan.titleWidthMm,
      heightMm,
      charWidthEm: TITLE_CHAR_WIDTH_EM,
      widthSafety: plan.titleWidthSafety,
    }
  }

  private seedRenderModelBuilder(ctx: RenderAssemblyContext): LabelRenderModelBuilder {
    const { input, content, plan, fitted } = ctx
    const { columns, visibleQrCodes } = plan
    const testIndicatorLayout = this.buildTestIndicatorLayout({
      testIndicators: content.testIndicators,
      columns,
      visibleQrCodes,
      titleLayout: fitted.titleLayout,
    })
    return new LabelRenderModelBuilder()
      .withTitle(content.title, content.demotedTitle)
      .withBodyLines({
        sourceLines: content.sourceLines,
        protocolLines: content.protocolLines,
        reconstitutionLines: content.reconstitutionLines,
      })
      .withQrCodes(visibleQrCodes)
      .withTestIndicators(content.testIndicators, testIndicatorLayout)
      .withCustomImage(input.customImage)
      .withDangerMode(plan.isDanger)
      .withColumnLayout(
        columns,
        computeIdentityHeaderTitleBreakout(columns, columns.logoWidthMm > 0, columns.qrWidthMm > 0),
      )
      .withLabelLayoutMode(plan.layoutMode)
      .withTitleTypography([...fitted.titleLayout.wrappedLines], fitted.titleLayout.fontSizePx)
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
        .withBodyFontSizePx(titleLayout.fontSizePx)
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

  private buildTestIndicatorLayout(ctx: IndicatorLayoutContext): TestIndicatorLayout | undefined {
    const indicatorsHeightMm = this.indicatorsHeightBelowTitle(ctx.titleLayout)
    return computeTestIndicatorLayout({
      effectiveDpi: this.printTarget.effectiveDpi,
      labelHeightMm: this.printTarget.labelHeightMm,
      paddingMm: this.printTarget.paddingMm,
      qrColumnWidthMm: ctx.columns.qrWidthMm,
      rowCount: ctx.testIndicators.length,
      qrSharesColumn: ctx.visibleQrCodes.length > 0,
      indicatorsHeightMm,
      labels: ctx.testIndicators.map((entry) => entry.label),
    })
  }

  private indicatorsHeightBelowTitle(titleLayout: {
    readonly wrappedLines: readonly string[]
    readonly fontSizePx: number
  }): number {
    const innerHeightMm = this.usableHeightMm()
    const titlePx = this.layoutEngine.estimateTitleHeightPx(
      titleLayout.wrappedLines.length,
      titleLayout.fontSizePx,
    )
    const gapPx =
      mmToPx(this.printTarget.paddingMm, this.printTarget.effectiveDpi) *
      IDENTITY_HEADER_TITLE_BAND_GAP_FRAC
    const rowPx = Math.max(0, mmToPx(innerHeightMm, this.printTarget.effectiveDpi) - titlePx - gapPx)
    return pxToMm(rowPx, this.printTarget.effectiveDpi)
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - this.printTarget.paddingMm * 2
  }
}
