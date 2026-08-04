import { describe, it, expect } from 'vitest'
import type { LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import {
    CALCULATOR_LABEL_BY_MODE,
    ensureReconstitutionPrintForAssist,
    parseCalculatorModeOption,
} from './calculatorModeSwitch'

describe('parseCalculatorModeOption', () => {
    it('should accept a known calculator mode label', () => {
        expect(parseCalculatorModeOption('Set Draw Volume')).toBe('Set Draw Volume')
    })

    it('should reject an unknown calculator mode label', () => {
        expect(parseCalculatorModeOption('Unknown Mode')).toBeNull()
    })
})

describe('CALCULATOR_LABEL_BY_MODE', () => {
    it('should freeze the mode-to-label map so callers cannot mutate it', () => {
        expect(Object.isFrozen(CALCULATOR_LABEL_BY_MODE)).toBe(true)
    })
})

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
        expect(ensureReconstitutionPrintForAssist(resolved, input)).toEqual({
            showReconstitution: true,
            showWater: true,
            showConcentration: true,
        })
    })

    it('should not enable reconstitution print toggles without a compound amount', () => {
        const input: LabelModelInput = {
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        }
        const resolved = resolveLabelMath(input)
        expect(ensureReconstitutionPrintForAssist(resolved, input)).toEqual({})
    })
})
