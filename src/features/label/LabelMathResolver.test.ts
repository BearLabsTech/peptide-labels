import { describe, it, expect } from 'vitest'
import { resolveLabelMath } from './LabelMathResolver'

describe('LabelMathResolver', () => {

    it('should perform forward math and format MG concentration when vial, water, and dose are present', () => {
        const result = resolveLabelMath({
            compoundAmount: '10', vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '500', doseUnit: 'mcg'
        })
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')

        expect(result.mergedInput.protocolUnits).toBe('10 units')
        expect(result.mergedInput.concentration).toBe('5mg per ml')
    })

    it('should perform reverse math and format MG concentration when vial, draw units, and dose are present', () => {
        const result = resolveLabelMath({
            compoundAmount: '10', vialUnit: 'mg',
            protocolUnits: '10 units',
            protocolAmount: '500', doseUnit: 'mcg'
        })
        expect(result.autoWater).toBe('2')
        // strict separation prevents echoing user input into the auto-calculated placeholder
        expect(result.autoUnits).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')

        expect(result.mergedInput.reconstitutionAmount).toBe('2')
        expect(result.mergedInput.concentration).toBe('5mg per ml')
    })

    it('should perform forward math and format IU concentration when IU units are selected', () => {
        const result = resolveLabelMath({
            compoundAmount: '5000', vialUnit: 'IU',
            reconstitutionAmount: '2',
            protocolAmount: '250', doseUnit: 'IU'
        })
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('2500IU per ml')
    })

    it('should return default empty state when inputs are incomplete', () => {
        const result = resolveLabelMath({ compoundAmount: '10', vialUnit: 'mg' })
        expect(result.autoUnits).toBe('')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('')
    })

    it('should gracefully handle text strings or invalid inputs without crashing', () => {
        const result = resolveLabelMath({
            compoundAmount: 'abc', vialUnit: 'mg',
            reconstitutionAmount: 'xyz',
            protocolAmount: '500', doseUnit: 'mcg'
        })
        expect(result.autoUnits).toBe('')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('')
    })
})