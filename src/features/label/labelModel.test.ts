import { describe, it, expect } from 'vitest'
import { DEFAULT_LABEL_LAYOUT_MODE, LabelModelBuilder, resolveLabelLayoutMode, formatWaterVolumeLabel, formatDrawVolumeLabel } from './labelModel'

describe('formatWaterVolumeLabel', () => {
  it('should append ml to a bare numeric water amount', () => {
    expect(formatWaterVolumeLabel('2')).toBe('2 ml')
  })

  it('should normalize water amounts that already include ml', () => {
    expect(formatWaterVolumeLabel('2ml')).toBe('2 ml')
    expect(formatWaterVolumeLabel('2 ml')).toBe('2 ml')
  })

  it('should return empty string for missing values', () => {
    expect(formatWaterVolumeLabel('')).toBe('')
    expect(formatWaterVolumeLabel(undefined)).toBe('')
  })
})

describe('formatDrawVolumeLabel', () => {
  it('should append units to a bare numeric draw volume', () => {
    expect(formatDrawVolumeLabel('10')).toBe('10 units')
  })

  it('should leave draw volume unchanged when units are already present', () => {
    expect(formatDrawVolumeLabel('10 units')).toBe('10 units')
  })

  it('should return empty string for missing values', () => {
    expect(formatDrawVolumeLabel('')).toBe('')
    expect(formatDrawVolumeLabel(undefined)).toBe('')
  })
})

describe('LabelModelBuilder', () => {

  it('itShouldDefaultLabelLayoutModeToIdentityHeader', () => {
    expect(resolveLabelLayoutMode({})).toBe(DEFAULT_LABEL_LAYOUT_MODE)
    expect(resolveLabelLayoutMode({ labelLayoutMode: 'identityHeader' })).toBe('identityHeader')
  })

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