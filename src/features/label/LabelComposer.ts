import type { LabelModelInput, LabelLayoutMode } from './labelModel'
import { resolveLabelLayoutMode } from './labelModel'
import {
  LabelLayoutEngine,
  type BoxedSection,
  type LabelLayoutInput,
  type LabelLayoutResult,
} from './LabelLayoutEngine'
import { resolveLabelMath } from './LabelMathResolver'
import { buildLabelContent } from './labelContent'
import { buildQrCodes, type QrCodeEntry } from './coaLinks'
import { buildTestIndicators, hasTestingColumnContent, shouldShowCoaQr, type TestIndicatorEntry } from './testIndicators'
import { computeTestIndicatorLayout, type TestIndicatorLayout } from './testIndicatorLayout'
import { computeColumnLayout, computeIdentityHeaderTitleWidthMm } from './labelColumnLayout'
import { maxFontSizePxForLabelHeight, MIN_TITLE_TO_BODY_FONT_RATIO, TITLE_HEIGHT_WEIGHT_DANGER, TITLE_HEIGHT_WEIGHT_WITH_BODY, IDENTITY_HEADER_TITLE_BAND_GAP_FRAC, MIN_FONT_SIZE_PX, DANGER_BODY_FONT_SCALE } from './labelLayoutConstants'
import { mmToPx, pxToMm } from './print/dimensions'
import type { PrintTarget } from './print/types'
import { resolvePrintTarget } from './print/PrintTargetResolver'

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

/** Bold uppercase title (`font-weight: 900`) — Arial caps run ~0.95em per character. */
const TITLE_CHAR_WIDTH_EM = 0.95
const TITLE_WIDTH_FRAC = 0.92

export class LabelComposer {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly printTarget: PrintTarget
  private readonly maxFontSizePx: number

  constructor(printTarget: PrintTarget = resolvePrintTarget({})) {
    this.printTarget = printTarget
    this.maxFontSizePx = maxFontSizePxForLabelHeight(printTarget.labelHeightMm)
    this.layoutEngine = new LabelLayoutEngine(printTarget.effectiveDpi, this.maxFontSizePx)
  }

  public compose(rawInput: LabelModelInput): LabelRenderModel {
    const resolved = resolveLabelMath(rawInput);
    const input = resolved.mergedInput;
    const {
      title,
      demotedTitle,
      sourceLines,
      reconstitutionLines,
      protocolLines,
    } = buildLabelContent(input, resolved);

    const qrCodes = buildQrCodes(input);
    const testIndicators = buildTestIndicators(input);

    return this.calculateLayouts(input, title, demotedTitle, sourceLines, reconstitutionLines, protocolLines, qrCodes, testIndicators);
  }

  private calculateLayouts(
    input: LabelModelInput,
    title: string,
    demotedTitle: string | undefined,
    srcLines: readonly string[],
    recLines: readonly string[],
    proLines: readonly string[],
    qrCodes: readonly QrCodeEntry[],
    testIndicators: readonly TestIndicatorEntry[],
  ): LabelRenderModel {
    const hasBody = recLines.length > 0 || proLines.length > 0 || srcLines.length > 0 || !!demotedTitle;
    const isDanger = !!input.isUntested;

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
    const layoutMode = resolveLabelLayoutMode(input)
    const centerColumnMm = columns.centerWidthMm
    const baseWidthMm = centerColumnMm * TITLE_WIDTH_FRAC
    const titleWidthMm = computeIdentityHeaderTitleWidthMm(columns, isDanger)
    const titleWidthSafety = 1
    const innerHeightMm = this.usableHeightMm();
    const labelWidthPx = mmToPx(this.printTarget.labelWidthMm, this.printTarget.effectiveDpi);
    const titleBodyGapMm = this.printTarget.paddingMm;

    const boxes: BoxedSection[] = [
      ...(recLines.length > 0 ? [{ lines: recLines }] : []),
      ...(proLines.length > 0 ? [{ lines: proLines }] : []),
      ...(srcLines.length > 0 ? [{ lines: srcLines }] : []),
    ];
    if (!hasBody) {
      const titleLayout = this.layoutEngine.layout({
        lines: title.split('\n').map((line) => line.toUpperCase()),
        widthMm: titleWidthMm,
        heightMm: innerHeightMm,
        charWidthEm: TITLE_CHAR_WIDTH_EM,
        widthSafety: titleWidthSafety,
      });
      const testIndicatorLayout = this.buildTestIndicatorLayout(
        testIndicators, columns, visibleQrCodes, titleLayout,
      );
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
      };
    }

    const titleHeightWeight = isDanger
      ? TITLE_HEIGHT_WEIGHT_DANGER
      : TITLE_HEIGHT_WEIGHT_WITH_BODY
    const titleLinesUpper = title.split('\n').map((line) => line.toUpperCase());
    const titleInput = {
      lines: titleLinesUpper,
      widthMm: titleWidthMm,
      heightMm: innerHeightMm * titleHeightWeight,
      charWidthEm: TITLE_CHAR_WIDTH_EM,
      widthSafety: titleWidthSafety,
    };

    const { titleLayout, bodyLayout } = this.fitTitleAndBodyLayouts({
      titleInput,
      boxes,
      demotedTitle,
      baseWidthMm,
      labelWidthPx,
      innerHeightMm,
      titleBodyGapMm,
    });

    const testIndicatorLayout = this.buildTestIndicatorLayout(
      testIndicators, columns, visibleQrCodes, titleLayout,
    );

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
    titleInput: LabelLayoutInput;
    titleLayout: LabelLayoutResult;
    bodyLayout: LabelLayoutResult;
    bodyHeightMm: number;
    innerHeightMm: number;
    titleBodyGapMm: number;
    layoutBodyAtFont: (bodyHeightMm: number, bodyFontPx: number) => LabelLayoutResult;
    stackFits: (
      tLayout: LabelLayoutResult,
      bLayout: LabelLayoutResult,
      bodyHeightMm: number,
    ) => boolean;
  }): {
    titleLayout: LabelLayoutResult;
    bodyLayout: LabelLayoutResult;
    bodyHeightMm: number;
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
    } = params;

    if (titleLayout.fontSizePx >= bodyLayout.fontSizePx * MIN_TITLE_TO_BODY_FONT_RATIO) {
      return { titleLayout, bodyLayout, bodyHeightMm };
    }

    for (let titleFont = this.maxFontSizePx; titleFont >= MIN_FONT_SIZE_PX; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont);
      if (!titleAttempt) continue;

      const attemptBodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm);
      const maxBodyFont = Math.floor(titleFont / MIN_TITLE_TO_BODY_FONT_RATIO);

      for (let bodyFont = Math.min(maxBodyFont, bodyLayout.fontSizePx); bodyFont >= MIN_FONT_SIZE_PX; bodyFont--) {
        const bodyAttempt = layoutBodyAtFont(attemptBodyHeightMm, bodyFont);
        if (stackFits(titleAttempt, bodyAttempt, attemptBodyHeightMm)) {
          return { titleLayout: titleAttempt, bodyLayout: bodyAttempt, bodyHeightMm: attemptBodyHeightMm };
        }
      }
    }

    return { titleLayout, bodyLayout, bodyHeightMm };
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
    return this.printTarget.labelHeightMm - (this.printTarget.paddingMm * 2);
  }
}
