import { describe, expect, it } from 'vitest'
import {
  makeConcentrationPerMl,
  makeDrawUnits,
  makeMass,
  makeSyringeCapacityMl,
  makeVialCapacityMl,
  makeVolumeMl,
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
    expect(protocolAmountInVialUnits(500, 'mcg', 'mg')).toBe(0.5)
  })

  it('should reject mismatched IU worlds', () => {
    expect(protocolAmountInVialUnits(5, 'mg', 'IU')).toBeNull()
  })
})
