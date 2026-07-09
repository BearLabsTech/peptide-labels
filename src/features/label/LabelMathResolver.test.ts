import { describe, it, expect } from 'vitest'
import { resolveLabelMath } from './LabelMathResolver'

describe('LabelMathResolver', () => {

    it('should perform forward math and format MG concentration when vial, water, and protocol amount are present', () => {
        const result = resolveLabelMath({
            compoundAmount: '10', vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '500', measureUnit: 'mcg'
        })
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')

        expect(result.mergedInput.protocolUnits).toBe('10 units')
        expect(result.mergedInput.concentration).toBe('5mg per ml')
    })

    it('should perform reverse math and format MG concentration when vial, draw units, and protocol amount are present', () => {
        const result = resolveLabelMath({
            compoundAmount: '10', vialUnit: 'mg',
            protocolUnits: '10 units',
            protocolAmount: '500', measureUnit: 'mcg'
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
            protocolAmount: '250', measureUnit: 'IU'
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
            protocolAmount: '500', measureUnit: 'mcg'
        })
        expect(result.autoUnits).toBe('')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('')
    })

    it('should derive water from vial and target concentration before protocol amount is entered', () => {
        const result = resolveLabelMath({
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        })
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('')
        expect(result.autoConcentration).toBe('10mg per ml')
        expect(result.mergedInput.reconstitutionAmount).toBe('2')
    })

    it('should derive water and draw units from round concentration mode', () => {
        const result = resolveLabelMath({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '5',
        })
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoConcentration).toBe('5mg per ml')
        expect(result.mergedInput.reconstitutionAmount).toBe('2')
        expect(result.mergedInput.protocolUnits).toBe('10 units')
    })

    it('should accept any positive target concentration in set concentration mode', () => {
        const result = resolveLabelMath({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '7',
        })
        expect(result.autoWater).toBe('1.43')
        expect(result.autoUnits).toBe('7.1 units')
        expect(result.autoConcentration).toBe('7mg per ml')
    })

    it('should keep target concentration on label when rounded water would drift', () => {
        const result = resolveLabelMath({
            compoundAmount: '22',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '15',
        })
        expect(result.autoWater).toBe('1.47')
        expect(result.autoConcentration).toBe('15mg per ml')
        expect(result.mergedInput.concentration).toBe('15mg per ml')
        expect(result.autoUnits).toBe('26.7 units')
    })

    it('should use target units mode to derive water without forward math from stale water', () => {
        const result = resolveLabelMath({
            compoundAmount: '10',
            vialUnit: 'mg',
            reconstitutionAmount: '99',
            protocolUnits: '10 units',
            protocolAmount: '500',
            measureUnit: 'mcg',
            calculatorSolveMode: 'target_units',
        })
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')
    })

    it('should derive IU concentration solve results in round concentration mode', () => {
        const result = resolveLabelMath({
            compoundAmount: '5000',
            vialUnit: 'IU',
            protocolAmount: '250',
            measureUnit: 'IU',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '2500',
        })
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoConcentration).toBe('2500IU per ml')
    })
})

describe('assist mode authoritative inputs', () => {
    describe('set concentration mode', () => {
        it('should treat target concentration as authoritative over back-calculated vial ÷ rounded water', () => {
            const result = resolveLabelMath({
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                calculatorSolveMode: 'round_concentration',
                targetConcentration: '15',
            })
            // 22 ÷ 15 rounds to 1.47 ml; 22 ÷ 1.47 ≈ 14.97 — must not appear on label
            expect(result.autoWater).toBe('1.47')
            expect(result.autoConcentration).toBe('15mg per ml')
            expect(result.mergedInput.concentration).toBe('15mg per ml')
            expect(result.autoUnits).toBe('26.7 units')
        })

        it('should replace stale concentration and water when target concentration changes', () => {
            const result = resolveLabelMath({
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                calculatorSolveMode: 'round_concentration',
                targetConcentration: '15',
                concentration: '5mg per ml',
                reconstitutionAmount: '4.4',
                protocolUnits: '80 units',
            })
            expect(result.mergedInput.concentration).toBe('15mg per ml')
            expect(result.mergedInput.reconstitutionAmount).toBe('1.47')
            expect(result.mergedInput.protocolUnits).toBe('26.7 units')
        })
    })

    describe('set draw volume mode', () => {
        it('should treat user draw units as authoritative over forward-recalculated units from rounded water', () => {
            const result = resolveLabelMath({
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                protocolUnits: '27 units',
                calculatorSolveMode: 'target_units',
            })
            // Reverse water for 27 units → 1.49 ml; forward from rounded water would yield ~27.1 units
            expect(result.autoWater).toBe('1.49')
            expect(result.mergedInput.protocolUnits).toBe('27 units')
        })

        it('should replace stale draw units and water when user sets a new draw volume', () => {
            const result = resolveLabelMath({
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                protocolUnits: '27 units',
                calculatorSolveMode: 'target_units',
                reconstitutionAmount: '4.4',
                concentration: '5mg per ml',
            })
            expect(result.mergedInput.protocolUnits).toBe('27 units')
            expect(result.mergedInput.reconstitutionAmount).toBe('1.49')
            expect(result.mergedInput.concentration).toBe('14.77mg per ml')
        })
    })
})