import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine, type BoxedSection } from './LabelLayoutEngine'
import { resolveLabelMath } from './LabelMathResolver'
import { buildQrCodes, type QrCodeEntry } from './coaLinks'
import { buildTestIndicators, hasTestingColumnContent, shouldShowCoaQr, type TestIndicatorEntry } from './testIndicators'
import { computeTestIndicatorLayout, type TestIndicatorLayout } from './testIndicatorLayout'
import { computeColumnLayout } from './labelColumnLayout'
import { maxFontSizePxForLabelHeight, MIN_TITLE_TO_BODY_FONT_RATIO, TITLE_HEIGHT_WEIGHT, TITLE_HEIGHT_WEIGHT_DANGER } from './labelLayoutConstants'
import { mmToPx } from './print/dimensions'
import type { PrintTarget } from './print/types'
import { resolvePrintTarget } from './print/PrintTargetResolver'

export interface LabelRenderModel {
  wrappedLines: string[]; titleLines: string[]; titleFontSizePx: number; bodyFontSizePx: number;
  title: string; demotedTitle?: string; protocolLines: string[];
  reconstitutionLines: string[]; sourceLines: string[];
  qrCodes: QrCodeEntry[]; customImage?: string; isDangerMode: boolean;
  testIndicators: TestIndicatorEntry[];
  testIndicatorLayout?: TestIndicatorLayout;
  logoColumnWidthPercent: number;
  qrColumnWidthPercent: number;
}

/** Bold uppercase title (`font-weight: 900`) — Arial caps run ~0.95em per character. */
const TITLE_CHAR_WIDTH_EM = 0.95
const TITLE_WIDTH_SAFETY = 0.92
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
    const input = resolveLabelMath(rawInput).mergedInput;
    const { title, demotedTitle } = this.buildTitles(input);

    const sourceLines = input.showSource !== false ? this.buildSourceLines(input) : [];
    const reconstitutionLines = input.showReconstitution !== false ? this.buildReconstitutionLines(input) : [];
    const protocolLines = input.showProtocol !== false ? this.buildProtocolLines(input) : [];

    const qrCodes = buildQrCodes(input);
    const testIndicators = buildTestIndicators(input);

    return this.calculateLayouts(input, title, demotedTitle, sourceLines, reconstitutionLines, protocolLines, qrCodes, testIndicators);
  }

  private calculateLayouts(
    input: LabelModelInput,
    title: string,
    demotedTitle: string | undefined,
    srcLines: string[],
    recLines: string[],
    proLines: string[],
    qrCodes: QrCodeEntry[],
    testIndicators: TestIndicatorEntry[],
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
    const centerColumnMm = columns.centerWidthMm
    const baseWidthMm = centerColumnMm * TITLE_WIDTH_FRAC
    const titleWidthMm = isDanger ? (centerColumnMm * 0.65) : (centerColumnMm * TITLE_WIDTH_FRAC)
    const innerHeightMm = this.usableHeightMm();
    const labelWidthPx = mmToPx(this.printTarget.labelWidthMm, this.printTarget.effectiveDpi);
    const titleBodyGapMm = this.printTarget.paddingMm;

    const boxes: BoxedSection[] = [
      ...(recLines.length > 0 ? [{ lines: recLines }] : []),
      ...(proLines.length > 0 ? [{ lines: proLines }] : []),
      ...(srcLines.length > 0 ? [{ lines: srcLines }] : []),
    ];
    const testIndicatorLayout = this.buildTestIndicatorLayout(testIndicators, columns, visibleQrCodes);

    if (!hasBody) {
      const titleLayout = this.layoutEngine.layout({
        lines: title.split('\n').map((line) => line.toUpperCase()),
        widthMm: titleWidthMm,
        heightMm: innerHeightMm,
        charWidthEm: TITLE_CHAR_WIDTH_EM,
        widthSafety: TITLE_WIDTH_SAFETY,
      });
      return {
        wrappedLines: titleLayout.wrappedLines,
        titleLines: titleLayout.wrappedLines,
        titleFontSizePx: titleLayout.fontSizePx,
        bodyFontSizePx: titleLayout.fontSizePx,
        title, demotedTitle, sourceLines: srcLines, protocolLines: proLines, reconstitutionLines: recLines,
        qrCodes: visibleQrCodes, testIndicators, testIndicatorLayout, customImage: input.customImage, isDangerMode: isDanger,
        logoColumnWidthPercent: columns.logoWidthPercent,
        qrColumnWidthPercent: columns.qrWidthPercent,
      };
    }

    const titleHeightWeight = isDanger ? TITLE_HEIGHT_WEIGHT_DANGER : TITLE_HEIGHT_WEIGHT;
    const titleLinesUpper = title.split('\n').map((line) => line.toUpperCase());
    const titleInput = {
      lines: titleLinesUpper,
      widthMm: titleWidthMm,
      heightMm: innerHeightMm * titleHeightWeight,
      charWidthEm: TITLE_CHAR_WIDTH_EM,
      widthSafety: TITLE_WIDTH_SAFETY,
    };

    let titleLayout = this.layoutEngine.layout(titleInput);
    const innerPx = mmToPx(innerHeightMm, this.printTarget.effectiveDpi);

    const bodyInputBase = { boxes, demotedLine: demotedTitle, widthMm: baseWidthMm, labelWidthPx };
    const layoutBodyAtFont = (bodyHeightMm: number, bodyFontPx: number) => ({
      fontSizePx: bodyFontPx,
      wrappedLines: this.layoutEngine.layoutBoxedBody({ ...bodyInputBase, heightMm: bodyHeightMm }).wrappedLines,
    });

    const stackFits = (
      tLayout: { wrappedLines: string[]; fontSizePx: number },
      bLayout: { fontSizePx: number },
      bodyHeightMm: number,
    ) =>
      this.layoutEngine.sectionLabelsFitBoxWidth(baseWidthMm, bLayout.fontSizePx) &&
      this.layoutEngine.estimateCenterStackHeightPx(
        tLayout.wrappedLines.length,
        tLayout.fontSizePx,
        titleBodyGapMm,
        { boxes, demotedLine: demotedTitle, widthMm: baseWidthMm, heightMm: bodyHeightMm, labelWidthPx },
        bLayout.fontSizePx,
      ) <= innerPx;

    let bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleLayout, titleBodyGapMm);
    let bodyLayout = this.layoutEngine.layoutBoxedBody({
      boxes,
      demotedLine: demotedTitle,
      widthMm: baseWidthMm,
      heightMm: bodyHeightMm,
      labelWidthPx,
    });

    for (let bodyFont = bodyLayout.fontSizePx; bodyFont >= 8; bodyFont--) {
      const attempt = layoutBodyAtFont(bodyHeightMm, bodyFont);
      if (stackFits(titleLayout, attempt, bodyHeightMm)) {
        bodyLayout = attempt;
        break;
      }
      if (bodyFont === 8) bodyLayout = attempt;
    }

    if (!stackFits(titleLayout, bodyLayout, bodyHeightMm)) {
      for (let titleFont = titleLayout.fontSizePx - 1; titleFont >= 8; titleFont--) {
        const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont);
        if (!titleAttempt) continue;
        bodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm);
        const refitBody = this.layoutEngine.layoutBoxedBody({
          boxes,
          demotedLine: demotedTitle,
          widthMm: baseWidthMm,
          heightMm: bodyHeightMm,
          labelWidthPx,
        });
        for (let bodyFont = refitBody.fontSizePx; bodyFont >= 8; bodyFont--) {
          const attempt = layoutBodyAtFont(bodyHeightMm, bodyFont);
          if (stackFits(titleAttempt, attempt, bodyHeightMm)) {
            titleLayout = titleAttempt;
            bodyLayout = attempt;
            break;
          }
          if (bodyFont === 8) {
            titleLayout = titleAttempt;
            bodyLayout = attempt;
          }
        }
        if (stackFits(titleLayout, bodyLayout, bodyHeightMm)) break;
      }
    }

    ({ titleLayout, bodyLayout, bodyHeightMm } = this.boostTitleRelativeToBody({
      titleInput,
      titleLayout,
      bodyLayout,
      bodyHeightMm,
      innerHeightMm,
      titleBodyGapMm,
      layoutBodyAtFont,
      stackFits,
    }));

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleLines: titleLayout.wrappedLines,
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: isDanger ? (bodyLayout.fontSizePx * 0.8) : bodyLayout.fontSizePx,
      title, demotedTitle, sourceLines: srcLines, protocolLines: proLines, reconstitutionLines: recLines,
      qrCodes: visibleQrCodes, testIndicators, testIndicatorLayout, customImage: input.customImage, isDangerMode: isDanger,
      logoColumnWidthPercent: columns.logoWidthPercent,
      qrColumnWidthPercent: columns.qrWidthPercent,
    }
  }

  private boostTitleRelativeToBody(params: {
    titleInput: { lines: string[]; widthMm: number; heightMm: number; charWidthEm: number; widthSafety: number };
    titleLayout: { wrappedLines: string[]; fontSizePx: number };
    bodyLayout: { fontSizePx: number; wrappedLines: string[] };
    bodyHeightMm: number;
    innerHeightMm: number;
    titleBodyGapMm: number;
    layoutBodyAtFont: (bodyHeightMm: number, bodyFontPx: number) => { fontSizePx: number; wrappedLines: string[] };
    stackFits: (
      tLayout: { wrappedLines: string[]; fontSizePx: number },
      bLayout: { fontSizePx: number },
      bodyHeightMm: number,
    ) => boolean;
  }): {
    titleLayout: { wrappedLines: string[]; fontSizePx: number };
    bodyLayout: { fontSizePx: number; wrappedLines: string[] };
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

    for (let titleFont = this.maxFontSizePx; titleFont >= 8; titleFont--) {
      const titleAttempt = this.layoutEngine.layoutAtSize(titleInput, titleFont);
      if (!titleAttempt) continue;

      const attemptBodyHeightMm = this.remainingBodyHeightMm(innerHeightMm, titleAttempt, titleBodyGapMm);
      const maxBodyFont = Math.floor(titleFont / MIN_TITLE_TO_BODY_FONT_RATIO);

      for (let bodyFont = Math.min(maxBodyFont, bodyLayout.fontSizePx); bodyFont >= 8; bodyFont--) {
        const bodyAttempt = layoutBodyAtFont(attemptBodyHeightMm, bodyFont);
        if (stackFits(titleAttempt, bodyAttempt, attemptBodyHeightMm)) {
          return { titleLayout: titleAttempt, bodyLayout: bodyAttempt, bodyHeightMm: attemptBodyHeightMm };
        }
      }
    }

    return { titleLayout, bodyLayout, bodyHeightMm };
  }

  private buildTestIndicatorLayout(
    testIndicators: TestIndicatorEntry[],
    columns: ReturnType<typeof computeColumnLayout>,
    visibleQrCodes: QrCodeEntry[],
  ): TestIndicatorLayout | undefined {
    return computeTestIndicatorLayout({
      effectiveDpi: this.printTarget.effectiveDpi,
      labelHeightMm: this.printTarget.labelHeightMm,
      paddingMm: this.printTarget.paddingMm,
      qrColumnWidthMm: columns.qrWidthMm,
      rowCount: testIndicators.length,
      qrCodesAbove: visibleQrCodes.length > 0,
      labels: testIndicators.map((entry) => entry.label),
    })
  }

  private remainingBodyHeightMm(
    innerHeightMm: number,
    titleLayout: { wrappedLines: string[]; fontSizePx: number },
    titleBodyGapMm: number,
  ): number {
    const innerPx = mmToPx(innerHeightMm, this.printTarget.effectiveDpi)
    const titlePx = this.layoutEngine.estimateTitleHeightPx(titleLayout.wrappedLines.length, titleLayout.fontSizePx)
    const gapPx = mmToPx(titleBodyGapMm, this.printTarget.effectiveDpi)
    const remainingPx = Math.max(0, innerPx - titlePx - gapPx)
    return (remainingPx * 25.4) / this.printTarget.effectiveDpi
  }

  private formatDate(dateStr: string | undefined, format: string = 'YYYYMMDD'): string {
    if (!dateStr) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split('-');
    switch (format) {
      case 'MM/DD/YYYY': return `${m}/${d}/${y}`;
      case 'DD/MM/YYYY': return `${d}/${m}/${y}`;
      case 'YYYY-MM-DD': return dateStr;
      case 'YYYYMMDD':
      default: return `${y}${m}${d}`;
    }
  }

  private buildTitles(input: LabelModelInput) {
    const amountLine = this.formatAmount(input.compoundAmount, input.vialUnit || 'mg');
    const nameLine = (input.compoundName || '').trim();
    const titleLines = [nameLine, amountLine].filter(Boolean);
    const fullCompound = titleLines.join('\n');
    if (input.isUntested) return { title: 'DANGER\nUNTESTED', demotedTitle: fullCompound || undefined };
    return { title: fullCompound, demotedTitle: undefined };
  }

  private formatAmount(amount: string | undefined, unit: string): string {
    if (!amount) return '';
    return `${amount.trim().replace(/(mg|mcg|iu)$/i, '').trim()}${unit}`;
  }

  private buildSourceLines(input: LabelModelInput): string[] {
    if (input.showSource === false) return [];
    const lines: string[] = [];
    if (input.showVendor !== false && input.vendorName) lines.push(`Vendor: ${input.vendorName}`);
    if (input.showGroup !== false && input.groupBuyName) lines.push(`Group: ${input.groupBuyName}`);
    if (input.showBatch !== false && (input.batchNumber || input.batchDate)) {
      const batchParts = [];
      if (input.batchNumber) batchParts.push(`Lot: ${input.batchNumber}`);
      if (input.batchDate) batchParts.push(this.formatDate(input.batchDate, input.dateFormat));
      lines.push(batchParts.join(' '));
    }
    return lines;
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    if (input.showProtocol === false) return [];
    const lines: string[] = [];

    const unitsStr = input.showProtocolUnits !== false ? (input.protocolUnits || '') : '';
    const amtStr = input.showProtocolAmount !== false ? this.formatAmount(input.protocolAmount, input.measureUnit || 'mcg') : '';

    if (unitsStr && amtStr) lines.push(`${unitsStr} (${amtStr})`);
    else if (unitsStr || amtStr) lines.push(unitsStr || amtStr);

    if (input.showProtocolFrequency !== false && input.protocolFrequency) {
      lines.push(input.protocolFrequency);
    }
    return lines;
  }

  private buildReconstitutionLines(input: LabelModelInput): string[] {
    if (input.showReconstitution === false) return [];
    const lines: string[] = [];

    if (input.showWater !== false && (input.reconstitutionAmount || input.reconstitutionType)) {
      lines.push(`${input.reconstitutionAmount || ''} ${input.reconstitutionType || ''}`.trim());
    }

    if (input.showConcentration !== false && input.concentration) {
      lines.push(input.concentration);
    }

    if (input.showReconDate !== false && input.reconstitutionDate) {
      lines.push(`Mixed ${this.formatDate(input.reconstitutionDate, input.dateFormat)}`);
    }
    return lines;
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - (this.printTarget.paddingMm * 2);
  }
}
