import { describe, expect, it } from 'vitest'
import { resolveLabelMath } from './LabelMathResolver'
import { buildLabelContent, formatLabelDate, withReconstitutionMlSuffix } from './labelContent'
import type { LabelModelInput } from './labelModel'

describe('withReconstitutionMlSuffix', () => {
  it('should append ml when the amount has no unit', () => {
    const input: LabelModelInput = { reconstitutionAmount: '2' }
    expect(withReconstitutionMlSuffix(input)).toEqual({ reconstitutionAmount: '2ml' })
  })

  it('should leave amounts that already include ml unchanged', () => {
    const withUnit: LabelModelInput = { reconstitutionAmount: '2ml' }
    expect(withReconstitutionMlSuffix(withUnit)).toBe(withUnit)
  })

  it('should leave empty amounts unchanged', () => {
    const empty: LabelModelInput = { reconstitutionAmount: '' }
    expect(withReconstitutionMlSuffix(empty)).toBe(empty)
    const missing: LabelModelInput = {}
    expect(withReconstitutionMlSuffix(missing)).toBe(missing)
  })
})

describe('formatLabelDate', () => {
  it('should format ISO dates in every supported presentation', () => {
    expect(formatLabelDate('2026-07-14')).toBe('20260714')
    expect(formatLabelDate('2026-07-14', 'YYYY-MM-DD')).toBe('2026-07-14')
    expect(formatLabelDate('2026-07-14', 'MM/DD/YYYY')).toBe('07/14/2026')
    expect(formatLabelDate('2026-07-14', 'DD/MM/YYYY')).toBe('14/07/2026')
  })

  it('should preserve free text and handle empty values', () => {
    expect(formatLabelDate('Mixed July 14')).toBe('Mixed July 14')
    expect(formatLabelDate(undefined)).toBe('')
  })
})

describe('buildLabelContent', () => {
  it('should build visible content from one coherent resolved input', () => {
    const input: LabelModelInput = {
      compoundName: 'Test',
      compoundAmount: '20mg',
      vialUnit: 'mg',
      reconstitutionAmount: '2',
      reconstitutionType: 'BAC Water',
      reconstitutionDate: '2026-07-14',
      protocolAmount: '2mg',
      measureUnit: 'mg',
      protocolUnits: '20 units',
      protocolFrequency: 'Weekly',
      vendorName: 'Vendor',
      groupBuyName: 'Group',
      batchNumber: 'LOT-1',
      batchDate: '2026-07-01',
      calculatorSolveMode: 'standard',
    }

    expect(buildLabelContent(input, resolveLabelMath(input))).toEqual({
      title: 'Test\n20mg',
      demotedTitle: undefined,
      sourceLines: ['Vendor: Vendor', 'Group: Group', 'Lot: LOT-1 20260701'],
      reconstitutionLines: ['2 ml BAC Water', '10mg per ml', 'Mixed 20260714'],
      protocolLines: ['20 units (2mg)', 'Weekly'],
    })
  })

  it('should demote identity in danger mode and honor section visibility', () => {
    const input: LabelModelInput = {
      compoundName: 'Test',
      compoundAmount: '20',
      vialUnit: 'mg',
      isUntested: true,
      showSource: false,
      showReconstitution: false,
      showProtocol: false,
    }

    expect(buildLabelContent(input, resolveLabelMath(input))).toEqual({
      title: 'DANGER\nUNTESTED',
      demotedTitle: 'Test\n20mg',
      sourceLines: [],
      reconstitutionLines: [],
      protocolLines: [],
    })
  })
})
