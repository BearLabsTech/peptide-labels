import { describe, expect, it } from 'vitest'
import {
    computeMeasuresPerVialRaw,
    calculateRequiredWaterMl,
    formatMeasuresPerVialDisplay,
    isProtocolExceedsCompound,
    isWaterAboveVialCapacity,
} from './calculatorGuards'
import type { LabelModelInput } from './labelModel'

describe('calculatorGuards', () => {
    it('should block when protocol amount in mg exceeds compound amount', () => {
        const input: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '20',
            measureUnit: 'mg',
        }
        expect(isProtocolExceedsCompound(input)).toBe(true)
    })

    it('should block when protocol mcg exceeds vial mg on a shared basis', () => {
        const input: LabelModelInput = {
            compoundAmount: '5',
            vialUnit: 'mg',
            protocolAmount: '6000',
            measureUnit: 'mcg',
        }
        expect(isProtocolExceedsCompound(input)).toBe(true)
    })

    it('should allow protocol amounts that fit within the vial', () => {
        const input: LabelModelInput = {
            compoundAmount: '23.4',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
        }
        expect(isProtocolExceedsCompound(input)).toBe(false)
    })

    it('should compute raw measures per vial without rounding', () => {
        const input: LabelModelInput = {
            compoundAmount: '23.4',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
        }
        const raw = computeMeasuresPerVialRaw(input)
        expect(raw).toBeCloseTo(5.85, 10)
    })

    it('should format measures per vial to three decimals for display only', () => {
        expect(formatMeasuresPerVialDisplay(23.4 / 4)).toBe('5.850')
        expect(formatMeasuresPerVialDisplay(10 / 3)).toBe('3.333')
    })

    it('should not let display-rounded measures re-enter math without drift', () => {
        const vial = 10
        const protocol = 3
        const raw = vial / protocol
        const displayNumber = Number(formatMeasuresPerVialDisplay(raw))
        expect(vial / raw).toBeCloseTo(protocol, 10)
        expect(vial / displayNumber).not.toBeCloseTo(protocol, 10)
    })

    it('should detect explicit water above capacity in every calculator mode', () => {
        const common: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '1',
            measureUnit: 'mg',
        }
        const setDraw: LabelModelInput = {
            ...common,
            calculatorSolveMode: 'target_units',
            protocolUnits: '50 units',
        }
        const setConcentration: LabelModelInput = {
            ...common,
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '5',
        }
        const manual: LabelModelInput = {
            ...common,
            calculatorSolveMode: 'standard',
            reconstitutionAmount: '4',
        }

        expect(calculateRequiredWaterMl(setDraw)).toBe(10)
        expect(isWaterAboveVialCapacity(setDraw, 3)).toBe(true)
        expect(isWaterAboveVialCapacity(setConcentration, 3)).toBe(true)
        expect(isWaterAboveVialCapacity(manual, 3)).toBe(true)
        expect(isWaterAboveVialCapacity(manual, 4)).toBe(false)
    })

    it('should treat unparseable junk the same as "not entered" for every mode\'s required water', () => {
        const common: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '1',
            measureUnit: 'mg',
        }
        expect(calculateRequiredWaterMl({
            ...common,
            calculatorSolveMode: 'standard',
            reconstitutionAmount: 'not a number',
        })).toBeNull()
        expect(calculateRequiredWaterMl({
            ...common,
            calculatorSolveMode: 'target_units',
            protocolUnits: 'not a number',
        })).toBeNull()
        expect(calculateRequiredWaterMl({
            ...common,
            calculatorSolveMode: 'round_concentration',
            targetConcentration: 'not a number',
        })).toBeNull()
    })
})
