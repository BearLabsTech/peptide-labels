import { describe, it, expect } from 'vitest'
import { LabelModelBuilder } from './labelModel'

describe('LabelModelBuilder', () => {

  it('itShouldBuildAllLinesWhenAllFieldsProvided', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'Tirzepatide',
      compoundAmount: '20mg',
      reconstitutionAmount: '2ml',
      reconstitutionType: 'BAC',
      concentration: '1mg per 10 units',
      protocolUnits: '40 units weekly',
      protocolAmount: '4mg',
      reconstitutionDate: '20260222'
    })

    expect(result.lines).toEqual([
      'Tirzepatide',
      '20mg - 2ml BAC',
      '1mg per 10 units',
      '40 units weekly (4mg)',
      'Reconstituted 20260222'
    ])
  })

  it('itShouldOmitLinesWhenFieldsAreMissing', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'HCG',
      reconstitutionDate: 'Mixed Jan 3'
    })

    expect(result.lines).toEqual([
      'HCG',
      'Reconstituted Mixed Jan 3'
    ])
  })

  it('itShouldMaintainBasicStructureEvenIfUntested', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'Reta',
      isUntested: true
    })

    // The builder handles the list of strings, the Composer handles the Title decoration
    expect(result.lines).toEqual(['Reta'])
  })

  it('itShouldOmitReconstitutionLineWhenCompoundAmountMissing', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'Test',
      reconstitutionAmount: '2mL',
      reconstitutionType: 'BAC'
    })

    expect(result.lines).toEqual([
      'Test'
    ])
  })

  it('itShouldIncludeProtocolUnitsWithoutProtocolAmountWhenProtocolAmountMissing', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'Test',
      protocolUnits: '40 units weekly'
    })

    expect(result.lines).toEqual([
      'Test',
      '40 units weekly'
    ])
  })

})