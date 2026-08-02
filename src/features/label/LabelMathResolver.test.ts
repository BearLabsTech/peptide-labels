import { describe, it, expect } from 'vitest'
import { resolveLabelMath, type ResolvedLabelMath } from './LabelMathResolver'
import { displayConcentration, displayDrawUnits, displayWaterAmount } from './calculatorModeSwitch'
import type { LabelModelInput } from './labelModel'
import { roundConcentrationRoundingTrapScenario, roundTripDriftTrapScenario } from './testing/labelInputBuilder'

/**
 * What the calculator would actually show for water/units/concentration given
 * the same input and resolver result — the user-visible boundary that replaces
 * asserting on `result.mergedInput` directly (mergedInput is an internal
 * write-back structure removed in the calculator-state refactor, see
 * docs/CODE-QUALITY.md section B, "separate authored from derived data").
 */
function displayedValues(input: LabelModelInput, result: ResolvedLabelMath) {
    const mode = input.calculatorSolveMode || 'standard'
    return {
        water: displayWaterAmount(mode, input, result),
        units: displayDrawUnits(mode, input, result),
        concentration: displayConcentration(input, result),
    }
}

describe('LabelMathResolver', () => {

    it('should perform forward math and format MG concentration when vial, water, and protocol amount are present', () => {
        const input: LabelModelInput = {
            compoundAmount: '10', vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '500', measureUnit: 'mcg'
        }
        const result = resolveLabelMath(input)
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')

        expect(displayedValues(input, result).units).toBe('10 units')
        expect(displayedValues(input, result).concentration).toBe('5mg per ml')
    })

    it('should replace stale Manual Entry concentration from vial ÷ water (not keep prior assist value)', () => {
        const input: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '2.5',
            measureUnit: 'mg',
            protocolUnits: '25 units',
            // Leftover from previous Set Draw Volume solve (23.3 / 1.165 → 20)
            concentration: '20mg per ml',
            calculatorSolveMode: 'standard',
        }
        const result = resolveLabelMath(input)
        expect(result.autoConcentration).toBe('10mg per ml')
        expect(displayedValues(input, result).concentration).toBe('10mg per ml')
        expect(result.autoUnits).toBe('25 units')
    })

    it('should perform reverse math and format MG concentration when vial, draw units, and protocol amount are present', () => {
        const input: LabelModelInput = {
            compoundAmount: '10', vialUnit: 'mg',
            protocolUnits: '10 units',
            protocolAmount: '500', measureUnit: 'mcg'
        }
        const result = resolveLabelMath(input)
        expect(result.autoWater).toBe('2')
        // strict separation prevents echoing user input into the auto-calculated placeholder
        expect(result.autoUnits).toBe('')
        expect(result.autoConcentration).toBe('5mg per ml')

        expect(displayedValues(input, result).water).toBe('2')
        expect(displayedValues(input, result).concentration).toBe('5mg per ml')
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

    // Junk/invalid-input handling is covered by peptideMath.edge.test.ts's
    // "should not invent math from non-numeric label junk", which exercises
    // every field as junk (this test only junked two) for the same resolver
    // and the same all-empty assertion — kept there since that file is the
    // dedicated home for edge-case input handling.

    it('should derive water from vial and target concentration before protocol amount is entered', () => {
        const input: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const result = resolveLabelMath(input)
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('')
        expect(result.autoConcentration).toBe('10mg per ml')
        expect(displayedValues(input, result).water).toBe('2')
    })

    it('should derive water and draw units from round concentration mode', () => {
        const input: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '5',
        }
        const result = resolveLabelMath(input)
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('10 units')
        expect(result.autoConcentration).toBe('5mg per ml')
        expect(displayedValues(input, result).water).toBe('2')
        expect(displayedValues(input, result).units).toBe('10 units')
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
        expect(result.autoWater).toBe('1.429')
        expect(result.autoUnits).toBe('7.143 units')
        expect(result.autoConcentration).toBe('7mg per ml')
    })

    it('should keep target concentration on label when display-rounded water would drift', () => {
        const input = roundConcentrationRoundingTrapScenario()
        const result = resolveLabelMath(input)
        expect(result.autoWater).toBe('1.467')
        expect(result.autoConcentration).toBe('15mg per ml')
        expect(displayedValues(input, result).concentration).toBe('15mg per ml')
        expect(result.autoUnits).toBe('26.667 units')
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
        // The plain "fresh compute" case is covered above ("should keep target
        // concentration on label when display-rounded water would drift"); this
        // scenario additionally seeds stale values to prove they get replaced,
        // not merely computed correctly from a blank slate.
        it('should replace stale concentration and water when target concentration changes', () => {
            const input: LabelModelInput = {
                ...roundConcentrationRoundingTrapScenario(),
                concentration: '5mg per ml',
                reconstitutionAmount: '4.4',
                protocolUnits: '80 units',
            }
            const result = resolveLabelMath(input)
            expect(displayedValues(input, result).concentration).toBe('15mg per ml')
            expect(displayedValues(input, result).water).toBe('1.467')
            expect(displayedValues(input, result).units).toBe('26.667 units')
        })
    })

    describe('set draw volume mode', () => {
        it('should treat user draw units as authoritative over forward-recalculated units from rounded water', () => {
            const input: LabelModelInput = {
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                protocolUnits: '27 units',
                calculatorSolveMode: 'target_units',
            }
            const result = resolveLabelMath(input)
            // Exact reverse water 1.485 ml; concentration from exact water, not display-rounded water
            expect(result.autoWater).toBe('1.485')
            expect(displayedValues(input, result).units).toBe('27 units')
            expect(result.autoConcentration).toBe('14.815mg per ml')
        })

        it('should replace stale draw units and water when user sets a new draw volume', () => {
            const input: LabelModelInput = {
                compoundAmount: '22',
                vialUnit: 'mg',
                protocolAmount: '4',
                measureUnit: 'mg',
                protocolUnits: '27 units',
                calculatorSolveMode: 'target_units',
                reconstitutionAmount: '4.4',
                concentration: '5mg per ml',
            }
            const result = resolveLabelMath(input)
            expect(displayedValues(input, result).units).toBe('27 units')
            expect(displayedValues(input, result).water).toBe('1.485')
            expect(displayedValues(input, result).concentration).toBe('14.815mg per ml')
        })

        it('should keep clean concentration from exact water when display-rounded water would drift (23.3 / 10mg / 50u)', () => {
            const input = roundTripDriftTrapScenario()
            const result = resolveLabelMath(input)
            // Exact water 1.165 ml → concentration 20; rounding water first to 1.17 would yield ~19.91
            expect(result.autoWater).toBe('1.165')
            expect(result.autoConcentration).toBe('20mg per ml')
            expect(displayedValues(input, result).concentration).toBe('20mg per ml')
            expect(displayedValues(input, result).units).toBe('50 units')
        })
    })
})
