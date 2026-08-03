import { describe, expect, it } from 'vitest'
import {
  makeConcentrationPerMl,
  makeDrawUnits,
  makeMass,
  makeSyringeCapacityMl,
  makeUnitWorld,
  makeVialCapacityMl,
  makeVolumeMl,
  parseMeasureUnit,
  parseVialUnit,
  protocolAmountInVialUnits,
} from './units'

describe('unit value object constructors', () => {
  it('should accept a valid mass', () => {
    expect(makeMass(5, 'mg')).toEqual({
      ok: true,
      value: { value: 5, unit: 'mg', __brand: 'Mass' },
    })
  })

  it('should reject a negative mass', () => {
    expect(makeMass(-5, 'mg')).toEqual({
      ok: false,
      error: 'Mass must be a finite non-negative number',
    })
  })

  it('should reject an unrecognized mass unit', () => {
    expect(makeMass(5, 'g').ok).toBe(false)
  })

  it('should accept a valid volume', () => {
    expect(makeVolumeMl(1.5)).toEqual({
      ok: true,
      value: { value: 1.5, __brand: 'VolumeMl' },
    })
  })

  it('should reject NaN volume', () => {
    expect(makeVolumeMl(Number.NaN).ok).toBe(false)
  })

  it('should accept a valid concentration', () => {
    expect(makeConcentrationPerMl(10, 'mg')).toEqual({
      ok: true,
      value: { value: 10, unit: 'mg', __brand: 'ConcentrationPerMl' },
    })
  })

  it('should reject a negative concentration', () => {
    expect(makeConcentrationPerMl(-1, 'IU').ok).toBe(false)
  })

  it('should accept valid draw units', () => {
    expect(makeDrawUnits(15)).toEqual({
      ok: true,
      value: { value: 15, __brand: 'DrawUnits' },
    })
  })

  it('should reject negative draw units', () => {
    expect(makeDrawUnits(-1).ok).toBe(false)
  })

  it('should accept a valid vial capacity', () => {
    expect(makeVialCapacityMl(3)).toEqual({
      ok: true,
      value: { value: 3, __brand: 'VialCapacityMl' },
    })
  })

  it('should reject negative vial capacity', () => {
    expect(makeVialCapacityMl(-3).ok).toBe(false)
  })

  it('should accept a valid syringe capacity', () => {
    expect(makeSyringeCapacityMl(1)).toEqual({
      ok: true,
      value: { value: 1, __brand: 'SyringeCapacityMl' },
    })
  })

  it('should reject negative syringe capacity', () => {
    expect(makeSyringeCapacityMl(-1).ok).toBe(false)
  })

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
