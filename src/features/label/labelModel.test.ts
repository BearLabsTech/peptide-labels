import { describe, it, expect } from 'vitest'
import { LabelModelBuilder } from './labelModel'

describe('LabelModelBuilder', () => {

  it('itShouldBuildAllLinesWhenAllFieldsProvided', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'Tirzepatide',
      compoundAmount: '20',
      vialUnit: 'mg',
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

  it('itShouldFormatIuCorrectly', () => {
    const builder = new LabelModelBuilder()

    const result = builder.build({
      compoundName: 'HCG',
      compoundAmount: '5000',
      vialUnit: 'IU',
      reconstitutionAmount: '2ml',
      reconstitutionType: 'BAC'
    })

    expect(result.lines).toEqual([
      'HCG',
      '5000IU - 2ml BAC'
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

    expect(result.lines).toEqual(['Reta'])
  })
})