export interface LabelModelInput {
  compoundName?: string
  compoundAmount?: string
  reconstitutionAmount?: string
  reconstitutionType?: string
  concentration?: string

  protocolUnits?: string
  protocolAmount?: string
  protocolFrequency?: string

  reconstitutionDate?: string
}

export interface LabelModel {
  lines: string[]
}

export class LabelModelBuilder {

  public build(input: LabelModelInput): LabelModel {
    const lines: string[] = []

    this.addCompoundName(lines, input)
    this.addReconstitutionLine(lines, input)
    this.addConcentration(lines, input)
    this.addProtocolUnitLine(lines, input)
    this.addDateLine(lines, input)

    return { lines }
  }

  private addCompoundName(lines: string[], input: LabelModelInput): void {
    if (input.compoundName) lines.push(input.compoundName)
  }

  private addReconstitutionLine(lines: string[], input: LabelModelInput): void {
    if (!input.compoundAmount) return
    if (!input.reconstitutionAmount) return
    if (!input.reconstitutionType) return

    const line = `${input.compoundAmount} - ${input.reconstitutionAmount} ${input.reconstitutionType}`
    lines.push(line)
  }

  private addConcentration(lines: string[], input: LabelModelInput): void {
    if (input.concentration) lines.push(input.concentration)
  }

  private addProtocolUnitLine(lines: string[], input: LabelModelInput): void {
    if (!input.protocolUnits) return

    if (!input.protocolAmount) {
      lines.push(input.protocolUnits)
      return
    }

    const line = `${input.protocolUnits} (${input.protocolAmount})`
    lines.push(line)
  }

  private addDateLine(lines: string[], input: LabelModelInput): void {
    if (!input.reconstitutionDate) return

    const line = `Reconstituted ${input.reconstitutionDate}`
    lines.push(line)
  }

}