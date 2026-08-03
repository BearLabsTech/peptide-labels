import { describe, expect, it } from 'vitest'
import {
    DEFAULT_SYRINGE_CAPACITY_ML,
    isDrawOverSyringeCapacity,
    parseSyringeCapacityMl,
    syringeMaxUnits,
} from './syringeCapacity'

describe('syringe capacity', () => {
    it.each([
        [1, 100],
        [0.5, 50],
        [0.3, 30],
    ] as const)('should map %s ml to %s units', (syringeCapacityMl, maxUnits) => {
        expect(syringeMaxUnits(syringeCapacityMl)).toBe(maxUnits)
        expect(isDrawOverSyringeCapacity(maxUnits, syringeCapacityMl)).toBe(false)
        expect(isDrawOverSyringeCapacity(maxUnits + 0.001, syringeCapacityMl)).toBe(true)
    })

    it('should normalize supported values and reject invalid persisted values', () => {
        expect(parseSyringeCapacityMl(1)).toBe(1)
        expect(parseSyringeCapacityMl(0.5)).toBe(0.5)
        expect(parseSyringeCapacityMl(0.3)).toBe(0.3)
        expect(parseSyringeCapacityMl('0.5')).toBe(DEFAULT_SYRINGE_CAPACITY_ML)
        expect(parseSyringeCapacityMl(0.4)).toBe(DEFAULT_SYRINGE_CAPACITY_ML)
        expect(parseSyringeCapacityMl(undefined)).toBe(DEFAULT_SYRINGE_CAPACITY_ML)
    })
})
