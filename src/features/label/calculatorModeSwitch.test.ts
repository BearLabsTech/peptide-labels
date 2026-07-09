import { describe, it, expect } from 'vitest'
import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { resolveLabelMath } from './LabelMathResolver'
import {
    applyCalculatorModeSwitch,
    applyProtocolAmountChange,
    ensureReconstitutionPrintForAssist,
    displayDrawUnits,
    displayWaterAmount,
    readResolvedCalculatorValues,
} from './calculatorModeSwitch'

const EXPECTED = {
    water: '1',
    units: '15 units',
    concentration: '20mg per ml',
} as const

/** 20 mg vial, 1 ml water, 3 mg protocol — matches common label screenshot scenario. */
function manualScenario(): LabelModelInput {
    return {
        compoundAmount: '20',
        vialUnit: 'mg',
        reconstitutionAmount: '1',
        protocolAmount: '3',
        measureUnit: 'mg',
        protocolUnits: '15 units',
        calculatorSolveMode: 'standard',
    }
}

function switchMode(input: LabelModelInput, mode: CalculatorSolveMode): LabelModelInput {
    const resolved = resolveLabelMath(input)
    return applyCalculatorModeSwitch(input, mode, {
        autoConcentration: resolved.autoConcentration,
        autoUnits: resolved.autoUnits,
    })
}

function resolvedValues(input: LabelModelInput) {
    const resolved = resolveLabelMath(input)
    return readResolvedCalculatorValues(input, resolved)
}

describe('ensureReconstitutionPrintForAssist', () => {
    it('should enable reconstitution print toggles when set draw volume resolves water and concentration', () => {
        const input: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        }
        const resolved = resolveLabelMath(input)
        expect(ensureReconstitutionPrintForAssist('target_units', resolved, input)).toEqual({
            showReconstitution: true,
            showWater: true,
            showConcentration: true,
        })
    })

    it('should not enable reconstitution print toggles without a vial amount', () => {
        const input: LabelModelInput = {
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        }
        const resolved = resolveLabelMath(input)
        expect(ensureReconstitutionPrintForAssist('target_units', resolved, input)).toEqual({})
    })
})

describe('calculator mode switching', () => {
    it('should preserve manual-entry math when switching to set concentration and derive target 20 from vial and water', () => {
        const manual = manualScenario()
        const manualResult = resolvedValues(manual)
        expect(manualResult).toEqual(EXPECTED)

        const setConcentration = switchMode(manual, 'round_concentration')
        expect(setConcentration.targetConcentration).toBe('20')
        expect(setConcentration.reconstitutionAmount).toBe('1')
        expect(setConcentration.protocolUnits).toBe('15 units')

        const setConcentrationResult = resolvedValues(setConcentration)
        expect(setConcentrationResult).toEqual(EXPECTED)
    })

    it('should preserve math when switching from set concentration to set draw volume', () => {
        const setConcentration = switchMode(manualScenario(), 'round_concentration')
        const setDrawVolume = switchMode(setConcentration, 'target_units')

        expect(setDrawVolume.targetConcentration).toBe('20')
        expect(setDrawVolume.protocolUnits).toBe('15 units')
        expect(setDrawVolume.reconstitutionAmount).toBe('1')

        expect(resolvedValues(setDrawVolume)).toEqual(EXPECTED)
    })

    it('should preserve math when cycling manual → set concentration → set draw volume → manual', () => {
        let state = manualScenario()

        state = switchMode(state, 'round_concentration')
        expect(resolvedValues(state)).toEqual(EXPECTED)

        state = switchMode(state, 'target_units')
        expect(resolvedValues(state)).toEqual(EXPECTED)

        state = switchMode(state, 'standard')
        expect(resolvedValues(state)).toEqual(EXPECTED)
    })

    it('should not overwrite an existing target concentration when switching to set concentration', () => {
        const manual = {
            ...manualScenario(),
            targetConcentration: '12',
        }
        const setConcentration = switchMode(manual, 'round_concentration')

        expect(setConcentration.targetConcentration).toBe('12')
        expect(setConcentration.reconstitutionAmount).toBe('1')
        expect(setConcentration.protocolUnits).toBe('15 units')

        const result = resolveLabelMath(setConcentration)
        expect(result.autoWater).toBe('1.67')
        expect(result.autoUnits).toBe('25 units')
        expect(result.autoConcentration).toBe('12mg per ml')
    })

    it('should not overwrite existing draw units when switching to set draw volume', () => {
        const manual = manualScenario()
        const setDrawVolume = switchMode(manual, 'target_units')

        expect(setDrawVolume.protocolUnits).toBe('15 units')
        expect(resolvedValues(setDrawVolume)).toEqual(EXPECTED)
    })

    it('should default draw units from 10 units per mg only when draw volume is empty', () => {
        const noUnits = {
            ...manualScenario(),
            protocolUnits: '',
        }
        const setDrawVolume = switchMode(noUnits, 'target_units')

        expect(setDrawVolume.protocolUnits).toBe('30 units')

        const result = resolveLabelMath(setDrawVolume)
        expect(result.autoWater).toBe('2')
        expect(result.autoConcentration).toBe('10mg per ml')
    })

    it('should default to 10 units instead of zero when protocol amount is entered in set draw volume mode', () => {
        const updates = applyProtocolAmountChange({
            compoundAmount: '20',
            vialUnit: 'mg',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '0',
        }, '3')

        expect(updates.protocolUnits).toBe('30 units')
    })

    it('should fall back to 10 units when scaled draw volume would otherwise round to zero', () => {
        const updates = applyProtocolAmountChange({
            compoundAmount: '20',
            vialUnit: 'mg',
            measureUnit: 'mcg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '',
        }, '3')

        expect(updates.protocolUnits).toBe('10 units')
    })

    it('should default to flat 10 units without vial amount regardless of protocol unit', () => {
        const updates = applyProtocolAmountChange({
            measureUnit: 'mcg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '',
        }, '5')

        expect(updates.protocolUnits).toBe('10 units')
    })

    it('should scale draw units from vial once compound amount is known', () => {
        const withoutVial = applyProtocolAmountChange({
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '',
        }, '5')
        expect(withoutVial.protocolUnits).toBe('10 units')

        const withVial = applyProtocolAmountChange({
            compoundAmount: '20',
            vialUnit: 'mg',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '10 units',
        }, '5')
        expect(withVial.protocolUnits).toBe('50 units')
    })

    it('should hide assist water in the sidebar until vial amount is entered', () => {
        const input: LabelModelInput = {
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
            reconstitutionAmount: '99',
        }
        expect(displayWaterAmount('target_units', input)).toBe('')
    })

    it('should default target concentration to 10 only when no vial, water, or concentration exists', () => {
        const empty: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '3',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        }
        const setConcentration = switchMode(empty, 'round_concentration')

        expect(setConcentration.targetConcentration).toBe('10')

        const result = resolveLabelMath(setConcentration)
        expect(result.autoWater).toBe('2')
        expect(result.autoUnits).toBe('30 units')
        expect(result.autoConcentration).toBe('10mg per ml')
    })

    it('should keep set draw volume math correct when stale manual water is still stored', () => {
        const setDrawVolume = switchMode(manualScenario(), 'target_units')
        const withStaleWater = {
            ...setDrawVolume,
            reconstitutionAmount: '99',
        }

        const result = resolveLabelMath(withStaleWater)
        expect(result.autoWater).toBe('1')
        expect(result.mergedInput.reconstitutionAmount).toBe('1')
        expect(result.autoConcentration).toBe('20mg per ml')
        expect(displayWaterAmount('target_units', withStaleWater, result)).toBe('1')
    })

    it('should default target concentration and water when switching to set concentration with only vial amount', () => {
        const manual: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'standard',
        }
        const setConcentration = switchMode(manual, 'round_concentration')
        expect(setConcentration.targetConcentration).toBe('10')

        const result = resolveLabelMath(setConcentration)
        expect(result.autoWater).toBe('2')
        expect(result.autoConcentration).toBe('10mg per ml')
    })

    it('should keep 2.15 ml when switching from set concentration to set draw volume for a 21.5 mg vial', () => {
        const setConcentration: LabelModelInput = {
            compoundAmount: '21.5',
            vialUnit: 'mg',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '30 units',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const fromConcentration = resolveLabelMath(setConcentration)
        expect(fromConcentration.mergedInput.reconstitutionAmount).toBe('2.15')

        const setDrawVolume = switchMode(
            { ...setConcentration, reconstitutionAmount: '2' },
            'target_units',
        )
        const fromDrawVolume = resolveLabelMath(setDrawVolume)
        expect(fromDrawVolume.mergedInput.reconstitutionAmount).toBe('2.15')
        expect(fromDrawVolume.autoWater).toBe('2.15')
        expect(fromDrawVolume.autoConcentration).toBe('10mg per ml')
    })

    it('should keep set concentration math correct when stale manual water is still stored', () => {
        const setConcentration = switchMode(manualScenario(), 'round_concentration')
        const result = resolveLabelMath(setConcentration)

        expect(result.autoWater).toBe('1')
        expect(result.autoUnits).toBe('15 units')
        expect(result.autoConcentration).toBe('20mg per ml')
        expect(displayDrawUnits('round_concentration', setConcentration, result)).toBe('15 units')
    })
})

describe('calculator display helpers', () => {
    it('should prefer derived draw units in set concentration mode even when stale input remains', () => {
        const input: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '1',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '15 units',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '12',
        }
        const resolved = resolveLabelMath(input)
        expect(displayDrawUnits('round_concentration', input, resolved)).toBe('25 units')
    })

    it('should prefer user draw units in set draw volume mode even when stale input remains', () => {
        const input: LabelModelInput = {
            compoundAmount: '22',
            vialUnit: 'mg',
            reconstitutionAmount: '4.4',
            protocolAmount: '4',
            measureUnit: 'mg',
            protocolUnits: '27 units',
            calculatorSolveMode: 'target_units',
        }
        const resolved = resolveLabelMath(input)
        expect(displayDrawUnits('target_units', input, resolved)).toBe('27 units')
    })
})

describe('calculator mode switching with mcg protocol amounts', () => {
    it('should stay consistent across modes for a 10 mg vial with 500 mcg protocol', () => {
        const expected = {
            water: '2',
            units: '10 units',
            concentration: '5mg per ml',
        }

        const manual: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '500',
            measureUnit: 'mcg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'standard',
        }
        expect(resolvedValues(manual)).toEqual(expected)

        let state = switchMode(manual, 'round_concentration')
        expect(state.targetConcentration).toBe('5')
        expect(resolvedValues(state)).toEqual(expected)

        state = switchMode(state, 'target_units')
        expect(resolvedValues(state)).toEqual(expected)

        state = switchMode(state, 'standard')
        expect(resolvedValues(state)).toEqual(expected)
    })
})
