import type { LabelModelInput } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import type { LabelLayoutResult } from './LabelLayoutEngine'

export interface LabelRenderModel {
  wrappedLines: string[]
  titleFontSizePx: number
  bodyFontSizePx: number
  title: string
  protocolLines: string[]
  reconstitutionLines: string[]
  qrCodes: { type: string, url: string }[]
  customImage?: string
}

export class LabelComposer {
  private readonly layoutEngine = new LabelLayoutEngine()
  private readonly labelWidthMm = 40
  private readonly labelHeightMm = 20
  private readonly paddingMm = 2

  public compose(input: LabelModelInput): LabelRenderModel {
    const isUntested = !!input.isUntested

    // 1. Build the multi-line Title
    const title = isUntested ? '☠️\nDanger\nUntested\n☠️' : this.buildStandardTitle(input)

    // 2. Build the Body Sections
    const reconstitutionLines = this.buildReconstitutionLines(input)
    const protocolLines = this.buildProtocolLines(input)

    const qrCodes = [
      { type: 'Vendor COA', url: input.vendorCoa },
      { type: 'Group COA', url: input.groupCoa },
      { type: 'My COA', url: input.myCoa }
    ].filter(qr => !!qr.url) as { type: string, url: string }[]

    const hasRight = qrCodes.length > 0;
    const hasLeft = !!input.customImage;

    // 3. Layout: Title gets 50% of height in Danger mode for maximum impact
    const titleHeightWeight = isUntested ? 0.5 : 0.4;
    const bodyHeightWeight = 1.0 - titleHeightWeight;

    const titleLayout = this.layoutEngine.layout({
      lines: title.split('\n'), // Forces the engine to treat each part as its own line
      widthMm: this.usableWidthMm(hasLeft, hasRight),
      heightMm: this.usableHeightMm() * titleHeightWeight
    })

    const bodyLayout = this.layoutEngine.layout({
      lines: [...reconstitutionLines, ...protocolLines],
      widthMm: this.usableWidthMm(hasLeft, hasRight),
      heightMm: this.usableHeightMm() * bodyHeightWeight
    })

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: bodyLayout.fontSizePx,
      title,
      protocolLines,
      reconstitutionLines,
      qrCodes,
      customImage: input.customImage
    }
  }

  private buildStandardTitle(input: LabelModelInput): string {
    const name = input.compoundName || ''
    const amount = input.compoundAmount || ''
    return amount ? `${name} ${amount}`.trim() : name
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    const lines: string[] = []
    const name = input.compoundName || ''
    const amount = input.compoundAmount || ''
    const fullName = amount ? `${name} ${amount}`.trim() : name

    // Always include the compound name in the protocol section (it's demoted in Danger mode)
    if (fullName) lines.push(fullName)

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