import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import { resolveLabelMath } from './LabelMathResolver'
import type { PrintTarget } from './print/types'
import { resolvePrintTarget } from './print/PrintTargetResolver'

export interface LabelRenderModel {
  wrappedLines: string[]; titleFontSizePx: number; bodyFontSizePx: number;
  title: string; demotedTitle?: string; protocolLines: string[];
  reconstitutionLines: string[]; sourceLines: string[];
  qrCodes: { type: string, url: string }[]; customImage?: string; isDangerMode: boolean;
}

/** Match `LabelPreview.css` fractional widths (flex row: left / center:flex / right). */
const LEFT_COLUMN_WIDTH_FRAC = 0.2
const RIGHT_COLUMN_WIDTH_FRAC = 0.38

export class LabelComposer {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly printTarget: PrintTarget

  constructor(printTarget: PrintTarget = resolvePrintTarget({})) {
    this.printTarget = printTarget
    this.layoutEngine = new LabelLayoutEngine(printTarget.effectiveDpi)
  }

  public compose(rawInput: LabelModelInput): LabelRenderModel {
    const input = resolveLabelMath(rawInput).mergedInput;
    const { title, demotedTitle } = this.buildTitles(input);

    const sourceLines = input.showSource !== false ? this.buildSourceLines(input) : [];
    const reconstitutionLines = input.showReconstitution !== false ? this.buildReconstitutionLines(input) : [];
    const protocolLines = input.showProtocol !== false ? this.buildProtocolLines(input) : [];

    const qrCodes = this.buildQrCodes(input);

    return this.calculateLayouts(input, title, demotedTitle, sourceLines, reconstitutionLines, protocolLines, qrCodes);
  }

  private calculateLayouts(input: LabelModelInput, title: string, demotedTitle: string | undefined, srcLines: string[], recLines: string[], proLines: string[], qrCodes: any[]): LabelRenderModel {
    const hasBody = recLines.length > 0 || proLines.length > 0 || srcLines.length > 0 || !!demotedTitle;
    const isDanger = !!input.isUntested;

    const baseWidthMm = this.usableWidthMm(!!input.customImage, qrCodes.length > 0) * 0.90;
    const titleWidthMm = isDanger ? (baseWidthMm * 0.65) : baseWidthMm;

    // FIX: Reduced title height ratio from 40% to 30% when a body is present 
    // to give the layout engine more conservative boundaries
    const titleHeightWeight = !hasBody ? 1.0 : (isDanger ? 0.35 : 0.30);

    const titleLayout = this.layoutEngine.layout({ lines: title.split('\n'), widthMm: titleWidthMm, heightMm: this.usableHeightMm() * titleHeightWeight });
    const bodyLayout = this.layoutEngine.layout({ lines: [...(demotedTitle ? [demotedTitle] : []), ...recLines, ...proLines, ...srcLines], widthMm: baseWidthMm, heightMm: this.usableHeightMm() * (!hasBody ? 0 : (1.0 - titleHeightWeight)) });

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx, bodyFontSizePx: isDanger ? (bodyLayout.fontSizePx * 0.8) : bodyLayout.fontSizePx,
      title, demotedTitle, sourceLines: srcLines, protocolLines: proLines, reconstitutionLines: recLines, qrCodes, customImage: input.customImage, isDangerMode: isDanger
    }
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
    const fullName = this.formatAmount(input.compoundAmount, input.vialUnit || 'mg');
    const fullCompound = fullName ? `${input.compoundName || ''} ${fullName}`.trim() : (input.compoundName || '');
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

  private buildQrCodes(input: LabelModelInput) {
    return [
      { type: 'Vendor COA', url: input.vendorCoa },
      { type: 'GB COA', url: input.groupBuyCoa },
      { type: 'TG COA', url: input.testGroupCoa },
      { type: 'My COA', url: input.myCoa },
      { type: input.customCoa1Name || 'Custom 1', url: input.customCoa1Link },
      { type: input.customCoa2Name || 'Custom 2', url: input.customCoa2Link }
    ].filter(qr => !!qr.url);
  }

  private usableWidthMm(hasLeft: boolean, hasRight: boolean): number {
    const innerMm = this.printTarget.labelWidthMm - this.printTarget.paddingMm * 2
    let centerFrac = 1.0
    if (hasLeft) centerFrac -= LEFT_COLUMN_WIDTH_FRAC
    if (hasRight) centerFrac -= RIGHT_COLUMN_WIDTH_FRAC
    return innerMm * centerFrac
  }

  private usableHeightMm(): number {
    return this.printTarget.labelHeightMm - (this.printTarget.paddingMm * 2);
  }
}
