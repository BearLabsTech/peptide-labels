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
}

export interface LabelComposerConfig {
  labelWidthMm?: number
  labelHeightMm?: number
  paddingMm?: number
}

export class LabelComposer {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly labelWidthMm: number
  private readonly labelHeightMm: number
  private readonly paddingMm: number

  public constructor(config: LabelComposerConfig = {}) {
    this.layoutEngine = new LabelLayoutEngine()
    this.labelWidthMm = config.labelWidthMm ?? 40
    this.labelHeightMm = config.labelHeightMm ?? 20
    this.paddingMm = config.paddingMm ?? 2
  }

  public compose(input: LabelModelInput): LabelRenderModel {
    const title = this.buildTitle(input)
    const protocolLines = this.buildProtocolLines(input)
    const reconstitutionLines = this.buildReconstitutionLines(input)

    const titleLayout = this.layoutTitle(title)
    const bodyLayout = this.layoutBody([...reconstitutionLines, ...protocolLines])

    return {
      wrappedLines: [...titleLayout.wrappedLines, ...bodyLayout.wrappedLines],
      titleFontSizePx: titleLayout.fontSizePx,
      bodyFontSizePx: bodyLayout.fontSizePx,
      title,
      protocolLines,
      reconstitutionLines
    }
  }

  private layoutTitle(title: string): LabelLayoutResult {
    return this.layoutEngine.layout({
      lines: [title],
      widthMm: this.usableWidthMm(),
      heightMm: this.usableHeightMm() * 0.4
    })
  }

  private layoutBody(bodyLines: string[]): LabelLayoutResult {
    return this.layoutEngine.layout({
      lines: bodyLines,
      widthMm: this.usableWidthMm(),
      heightMm: this.usableHeightMm() * 0.6
    })
  }

  private buildTitle(input: LabelModelInput): string {
    if (!input.compoundName) return input.compoundAmount ?? ''
    if (!input.compoundAmount) return input.compoundName
    return `${input.compoundName} ${input.compoundAmount}`
  }

  private buildProtocolLines(input: LabelModelInput): string[] {
    const lines: string[] = []
    const protocolUnitLine = this.buildProtocolUnitLine(input)

    if (protocolUnitLine) lines.push(protocolUnitLine)
    if (input.protocolFrequency) lines.push(input.protocolFrequency)

    return lines
  }

  private buildProtocolUnitLine(input: LabelModelInput): string | null {
    const hasUnits = !!input.protocolUnits;
    const hasAmount = !!input.protocolAmount;

    // THE FIX: Intelligently display whatever data we have
    if (!hasUnits && !hasAmount) return null;
    if (!hasUnits) return input.protocolAmount!;
    if (!hasAmount) return input.protocolUnits!;

    return `${input.protocolUnits} (${input.protocolAmount})`;
  }

  private buildReconstitutionLines(input: LabelModelInput): string[] {
    const lines: string[] = []
    const solutionLine = this.buildReconstitutionSolutionLine(input)

    if (solutionLine) lines.push(solutionLine)
    if (input.concentration) lines.push(input.concentration)
    if (input.reconstitutionDate) lines.push(input.reconstitutionDate)

    return lines
  }

  private buildReconstitutionSolutionLine(input: LabelModelInput): string {
    if (!input.reconstitutionAmount) return input.reconstitutionType ?? ''
    if (!input.reconstitutionType) return input.reconstitutionAmount
    return `${input.reconstitutionAmount} ${input.reconstitutionType}`
  }

  private usableWidthMm(): number {
    return Math.max(1, this.labelWidthMm - this.paddingMm * 2)
  }

  private usableHeightMm(): number {
    return Math.max(1, this.labelHeightMm - this.paddingMm * 2)
  }
}