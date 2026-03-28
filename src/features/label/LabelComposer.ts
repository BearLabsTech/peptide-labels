import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import type { LabelLayoutResult } from './LabelLayoutEngine'

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
    const amount = input.compoundAmount || ''
    const fullName = amount ? `${name} ${amount}`.trim() : name

    let title = '';
    let demotedTitle: string | undefined = undefined;

    if (isDangerMode) {
      title = 'DANGER\nUNTESTED';
      if (fullName) demotedTitle = fullName;
    } else {
      title = fullName;
    }

    const reconstitutionLines = this.buildReconstitutionLines(input)
    const protocolLines = this.buildProtocolLines(input)

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

    // 1. Calculate the true physical width of the center column (minus 10% for borders)
    const baseCenterWidthMm = this.usableWidthMm(hasLeft, hasRight) * 0.90;

    // 2. THE FIX: In Danger Mode, reserve exactly 50% of the space for the massive skulls.
    const titleWidthMm = isDangerMode ? (baseCenterWidthMm * 0.50) : baseCenterWidthMm;

    const titleLayout = this.layoutEngine.layout({
      lines: title.split('\n'),
      widthMm: titleWidthMm,
      heightMm: this.usableHeightMm() * titleHeightWeight
    })

    const bodyLayout = this.layoutEngine.layout({
      lines: [...(demotedTitle ? [demotedTitle] : []), ...reconstitutionLines, ...protocolLines],
      widthMm: baseCenterWidthMm,
      heightMm: this.usableHeightMm() * bodyHeightWeight
    })

    const finalBodyFontSize = isDangerMode ? (bodyLayout.fontSizePx * 0.8) : bodyLayout.fontSizePx;

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: finalBodyFontSize,
      title,
      demotedTitle,
      protocolLines,
      reconstitutionLines,
      qrCodes,
      customImage: input.customImage,
      isDangerMode
    }
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    const lines: string[] = []

    if (input.protocolUnits || input.protocolAmount) {
      const units = input.protocolUnits || ''
      const amt = input.protocolAmount || ''
      lines.push(amt ? `${units} (${amt})`.trim() : units)
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

  private usableHeightMm(): number {
    return this.labelHeightMm - (this.paddingMm * 2)
  }
}