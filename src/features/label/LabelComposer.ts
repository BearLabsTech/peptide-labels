import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import { resolveLabelMath } from './LabelMathResolver'
import { LABEL_CONFIG } from './LabelConfig'

export interface LabelRenderModel {
  wrappedLines: string[]; titleFontSizePx: number; bodyFontSizePx: number;
  title: string; demotedTitle?: string; protocolLines: string[];
  reconstitutionLines: string[]; sourceLines: string[];
  qrCodes: { type: string, url: string }[]; customImage?: string; isDangerMode: boolean;
}

export class LabelComposer {
  private readonly layoutEngine = new LabelLayoutEngine()
  private readonly labelWidthMm = LABEL_CONFIG.dimensions.widthMm
  private readonly labelHeightMm = LABEL_CONFIG.dimensions.heightMm
  private readonly paddingMm = LABEL_CONFIG.dimensions.paddingMm

  public compose(rawInput: LabelModelInput): LabelRenderModel {
    const input = resolveLabelMath(rawInput).mergedInput;
    const { title, demotedTitle } = this.buildTitles(input);
    const sourceLines = this.buildSourceLines(input);
    const reconstitutionLines = this.buildReconstitutionLines(input);
    const protocolLines = this.buildProtocolLines(input);
    const qrCodes = this.buildQrCodes(input);

    return this.calculateLayouts(input, title, demotedTitle, sourceLines, reconstitutionLines, protocolLines, qrCodes);
  }

  private calculateLayouts(input: LabelModelInput, title: string, demotedTitle: string | undefined, srcLines: string[], recLines: string[], proLines: string[], qrCodes: any[]): LabelRenderModel {
    const hasBody = recLines.length > 0 || proLines.length > 0 || srcLines.length > 0 || !!demotedTitle;
    const isDanger = !!input.isUntested;

    const baseWidthMm = this.usableWidthMm(!!input.customImage, qrCodes.length > 0) * 0.90;
    const titleWidthMm = isDanger ? (baseWidthMm * 0.65) : baseWidthMm;
    const titleHeightWeight = !hasBody ? 1.0 : (isDanger ? 0.45 : 0.4);

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
    const lines: string[] = [];
    if (input.vendorName) lines.push(`Vendor: ${input.vendorName}`);
    if (input.groupBuyName) lines.push(`Group: ${input.groupBuyName}`);
    if (input.batchNumber || input.batchDate) {
      const batchParts = [];
      if (input.batchNumber) batchParts.push(`Lot: ${input.batchNumber}`);
      if (input.batchDate) batchParts.push(this.formatDate(input.batchDate, input.dateFormat));
      lines.push(batchParts.join(' '));
    }
    return lines;
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    const lines: string[] = [];
    const units = input.protocolUnits || '';
    const amt = this.formatAmount(input.protocolAmount, input.measureUnit || 'mcg');

    if (units && amt) lines.push(`${units} (${amt})`);
    else if (units || amt) lines.push(units || amt);

    if (input.protocolFrequency) lines.push(input.protocolFrequency);
    return lines;
  }

  private buildReconstitutionLines(input: LabelModelInput): string[] {
    const lines: string[] = [];
    if (input.reconstitutionAmount || input.reconstitutionType) lines.push(`${input.reconstitutionAmount || ''} ${input.reconstitutionType || ''}`.trim());
    if (input.concentration) lines.push(input.concentration);
    if (input.reconstitutionDate) lines.push(`Mixed ${this.formatDate(input.reconstitutionDate, input.dateFormat)}`);
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
    let mult = 1.0;
    if (hasLeft) mult -= 0.25;
    if (hasRight) mult -= 0.25;
    return (this.labelWidthMm - (this.paddingMm * 2)) * mult;
  }

  private usableHeightMm(): number { return this.labelHeightMm - (this.paddingMm * 2); }
}