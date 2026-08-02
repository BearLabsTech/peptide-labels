import { describe, expect, it } from 'vitest'
import { resolveAssistModeUpdates } from './calculatorAssistSync'
import type { LabelModelInput } from './labelModel'
import { highCapacityRegressionScenario } from './testing/labelInputBuilder'

/** 100 mg vial / 1 mg protocol — regression fixture for vial-capacity warning behavior. */
const BASE_INPUT: LabelModelInput = highCapacityRegressionScenario()

describe('resolveAssistModeUpdates', () => {
    it('should not produce assist updates in Manual Entry', () => {
        expect(resolveAssistModeUpdates({
            ...BASE_INPUT,
            calculatorSolveMode: 'standard',
            reconstitutionAmount: '2',
        })).toEqual({})
    })

    it('should clear unresolved results and provide a flat draw placeholder without compound amount', () => {
        expect(resolveAssistModeUpdates({
            protocolAmount: '1',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
        })).toEqual({
            reconstitutionAmount: '',
            concentration: '',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
        })
    })

    it('should generate a display-safe concentration recommendation within capacity', () => {
        expect(resolveAssistModeUpdates({
            ...BASE_INPUT,
            calculatorSolveMode: 'round_concentration',
            targetConcentrationOrigin: 'recommended',
        }, 'capacity', 3)).toEqual({
            targetConcentration: '33.334',
            targetConcentrationOrigin: 'recommended',
            reconstitutionAmount: '3',
            concentration: '33.334mg per ml',
            showReconstitution: true,
            showWater: true,
            showConcentration: true,
            protocolUnits: '3 units',
            protocolUnitsOrigin: 'recommended',
        })
    })

    it('should preserve user-entered draw units when capacity changes', () => {
        const updates = resolveAssistModeUpdates({
            ...BASE_INPUT,
            calculatorSolveMode: 'target_units',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'user',
        }, 'capacity', 3)

        expect(updates.protocolUnits).toBeUndefined()
        expect(updates.protocolUnitsOrigin).toBeUndefined()
        expect(updates.reconstitutionAmount).toBe('10')
        expect(updates.concentration).toBe('10mg per ml')
    })

    it('should regenerate recommended draw units when capacity changes', () => {
        const updates = resolveAssistModeUpdates({
            ...BASE_INPUT,
            calculatorSolveMode: 'target_units',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
        }, 'capacity', 3)

        expect(updates.protocolUnits).toBe('3 units')
        expect(updates.protocolUnitsOrigin).toBe('recommended')
        expect(updates.reconstitutionAmount).toBe('3')
        expect(updates.concentration).toBe('33.333mg per ml')
    })
})
