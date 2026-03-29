import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import { calculateDrawVolume, calculateReverseWater } from './peptideMath'

export interface LabelRenderModel {
  wrappedLines: string[]
  titleFontSizePx: number
  bodyFontSizePx: number
  title: string
  demotedTitle?: string
  protocolLines: string[]
  reconstitutionLines: string[]
  qrCodes: { type: string, url: string }[]
  customImage?: string
  isDangerMode: boolean
}

export class LabelComposer {
  private readonly layoutEngine = new LabelLayoutEngine()
  private readonly labelWidthMm = 40
  private readonly labelHeightMm = 20
  private readonly paddingMm = 2

  public compose(input: LabelModelInput): LabelRenderModel {
    const isDangerMode = !!input.isUntested
    const name = input.compoundName || ''
    const vialUnit = input.vialUnit || 'mg'
    const formattedVialAmount = this.formatAmount(input.compoundAmount, vialUnit)
    const fullName = formattedVialAmount ? `${name} ${formattedVialAmount}`.trim() : name

    let title = '';
    let demotedTitle: string | undefined = undefined;

    if (isDangerMode) {
      title = 'DANGER\nUNTESTED';
      if (fullName) demotedTitle = fullName;
    } else {
      title = fullName;
    }

    // --- NEW: DERIVED STATE ENGINE ---
    // Mathematically guarantees the label has the correct numbers even if the parent state drops them
    const vial = parseFloat(input.compoundAmount || '0')
    const water = parseFloat(input.reconstitutionAmount || '0')
    const dose = parseFloat(input.protocolAmount || '0')

    const unitsStr = input.protocolUnits || ''
    const unitsMatch = unitsStr.match(/[\d.]+/);
    const units = unitsMatch ? parseFloat(unitsMatch[0]) : 0;

    const safeVialUnit = (input.vialUnit || 'mg') as 'mg' | 'IU'
    const safeDoseUnit = (safeVialUnit === 'IU' ? 'IU' : (input.doseUnit || 'mcg')) as 'mg' | 'mcg' | 'IU'

    let finalWater = input.reconstitutionAmount || '';
    let finalUnits = input.protocolUnits || '';
    let finalConcentration = input.concentration || '';

    // Forward Math Fallback
    if (water > 0 && vial > 0 && dose > 0) {
      const res = calculateDrawVolume({ vialAmount: vial, vialUnit: safeVialUnit, waterMl: water, doseAmount: dose, doseUnit: safeDoseUnit });
      if (res) {
        finalUnits = input.protocolUnits || `${res.drawUnits} units`;
        const conc = Math.round((vial / water) * 100) / 100;
        finalConcentration = input.concentration || `${conc}${safeVialUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;
      }
    }
    // Reverse Math Fallback
    else if (units > 0 && vial > 0 && dose > 0) {
      const resWater = calculateReverseWater({ vialAmount: vial, vialUnit: safeVialUnit, drawUnits: units, doseAmount: dose, doseUnit: safeDoseUnit });
      if (resWater) {
        finalWater = input.reconstitutionAmount || resWater.toString();
        const conc = Math.round((vial / resWater) * 100) / 100;
        finalConcentration = input.concentration || `${conc}${safeVialUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;
      }
    }

    const derivedInput = {
      ...input,
      reconstitutionAmount: finalWater,
      protocolUnits: finalUnits,
      concentration: finalConcentration
    }
    // --------------------------------

    const reconstitutionLines = this.buildReconstitutionLines(derivedInput)
    const protocolLines = this.buildProtocolLines(derivedInput)

    const qrCodes = [
      { type: 'Vendor COA', url: input.vendorCoa },
      { type: 'Group COA', url: input.groupCoa },
      { type: 'My COA', url: input.myCoa }
    ].filter(qr => !!qr.url) as { type: string, url: string }[]

    const hasRight = qrCodes.length > 0;
    const hasLeft = !!input.customImage;
    const hasBody = reconstitutionLines.length > 0 || protocolLines.length > 0 || !!demotedTitle;

    const titleHeightWeight = !hasBody ? 1.0 : (isDangerMode ? 0.45 : 0.4);
    const bodyHeightWeight = !hasBody ? 0 : (1.0 - titleHeightWeight);

    const baseCenterWidthMm = this.usableWidthMm(hasLeft, hasRight) * 0.90;
    const titleWidthMm = isDangerMode ? (baseCenterWidthMm * 0.65) : baseCenterWidthMm;

    const titleLayout = this.layoutEngine.layout({
      lines: title.split('\n'), widthMm: titleWidthMm, heightMm: this.usableHeightMm() * titleHeightWeight
    })

    const bodyLayout = this.layoutEngine.layout({
      lines: [...(demotedTitle ? [demotedTitle] : []), ...reconstitutionLines, ...protocolLines],
      widthMm: baseCenterWidthMm, heightMm: this.usableHeightMm() * bodyHeightWeight
    })

    const finalBodyFontSize = isDangerMode ? (bodyLayout.fontSizePx * 0.8) : bodyLayout.fontSizePx;

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: finalBodyFontSize,
      title, demotedTitle, protocolLines, reconstitutionLines, qrCodes, customImage: input.customImage, isDangerMode
    }
  }

  private formatAmount(amount: string | undefined, unit: string): string {
    if (!amount) return '';
    let cleanAmt = amount.trim().replace(/(mg|mcg|iu)$/i, '').trim();
    return `${cleanAmt}${unit}`;
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    const lines: string[] = []
    if (input.protocolUnits || input.protocolAmount) {
      const units = input.protocolUnits || ''
      const amt = this.formatAmount(input.protocolAmount, input.doseUnit || 'mcg')

      if (units && amt) lines.push(`${units} (${amt})`)
      else if (units) lines.push(units)
      else if (amt) lines.push(amt)
    }
    if (input.protocolFrequency) lines.push(input.protocolFrequency)
    return lines
  }

  private buildReconstitutionLines(input: LabelModelInput): string[] {
    const lines: string[] = []
    if (input.reconstitutionAmount || input.reconstitutionType) {
      lines.push(`${input.reconstitutionAmount || ''} ${input.reconstitutionType || ''}`.trim())
    }
    if (input.concentration) lines.push(input.concentration)
    if (input.reconstitutionDate) lines.push(input.reconstitutionDate)
    return lines
  }

  private usableWidthMm(hasLeft: boolean, hasRight: boolean): number {
    let mult = 1.0;
    if (hasLeft) mult -= 0.25;
    if (hasRight) mult -= 0.25;
    return (this.labelWidthMm - (this.paddingMm * 2)) * mult;
  }
  private usableHeightMm(): number { return this.labelHeightMm - (this.paddingMm * 2) }
}