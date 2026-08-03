import { describe, expect, it } from 'vitest'
import {
  makeUnitWorld,
  parseMeasureUnit,
  parseVialUnit,
  protocolAmountInVialUnits,
} from './units'

describe('unit conversions', () => {
  it('should convert mcg protocol amounts into mg vial units', () => {
    expect(protocolAmountInVialUnits(500, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(0.5)
  })

  // A mismatched pairing (e.g. mg vial / IU protocol unit) is unrepresentable via
  // UnitWorld — see "should reject an inconsistent vial/measure pairing" below.

  it('should parse a valid vial unit', () => {
    expect(parseVialUnit('mg')).toBe('mg')
    expect(parseVialUnit('IU')).toBe('IU')
  })

  it('should reject an invalid vial unit', () => {
    expect(parseVialUnit('g')).toBeUndefined()
  })

  it('should parse a valid measure unit', () => {
    expect(parseMeasureUnit('mcg')).toBe('mcg')
  })

  it('should reject an invalid measure unit', () => {
    expect(parseMeasureUnit('grams')).toBeUndefined()
  })
})

describe('makeUnitWorld', () => {
  it('should accept an mg vial paired with mg or mcg', () => {
    expect(makeUnitWorld('mg', 'mg')).toEqual({ vialUnit: 'mg', measureUnit: 'mg' })
    expect(makeUnitWorld('mg', 'mcg')).toEqual({ vialUnit: 'mg', measureUnit: 'mcg' })
  })

  it('should accept an IU vial paired with IU', () => {
    expect(makeUnitWorld('IU', 'IU')).toEqual({ vialUnit: 'IU', measureUnit: 'IU' })
  })

  it('should reject an inconsistent vial/measure pairing', () => {
    expect(makeUnitWorld('mg', 'IU')).toBeNull()
    expect(makeUnitWorld('IU', 'mg')).toBeNull()
    expect(makeUnitWorld('IU', 'mcg')).toBeNull()
  })
})
