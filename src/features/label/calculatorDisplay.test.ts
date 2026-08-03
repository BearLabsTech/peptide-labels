import { describe, it, expect } from 'vitest'
import type { LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { displayConcentration, displayDrawUnits, displayWaterAmount } from './calculatorDisplay'
import { readResolvedCalculatorValues } from './calculatorModeSwitch'

describe('calculator display helpers', () => {
    it('should hide assist water in the sidebar until compound amount is entered', () => {
        const input: LabelModelInput = {
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
            reconstitutionAmount: '99',
        }
        expect(displayWaterAmount('target_units', input)).toBe('')
    })

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

    it('should prefer derived concentration in Manual Entry even when stale assist concentration remains', () => {
        const input: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '2.5',
            measureUnit: 'mg',
            concentration: '20mg per ml',
            calculatorSolveMode: 'standard',
        }
        const resolved = resolveLabelMath(input)
        expect(displayConcentration(input, resolved)).toBe('10mg per ml')
        expect(readResolvedCalculatorValues(input, resolved).concentration).toBe('10mg per ml')
    })
})
