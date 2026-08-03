import { describe, expect, it } from 'vitest'
import { StandardSolve } from './standardSolve'
import type { LabelModelInput } from '../labelModel'

describe('StandardSolve.deriveMath', () => {
    it('derives concentration from vial ÷ water when both are present', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2' }
        expect(StandardSolve.deriveMath(draft).autoConcentration).toBe('10mg per ml')
    })

    it('derives forward draw units when vial, water, and protocol amount are all present', () => {
        const draft: LabelModelInput = {
            compoundAmount: '10', vialUnit: 'mg', reconstitutionAmount: '2', protocolAmount: '500', measureUnit: 'mcg',
        }
        expect(StandardSolve.deriveMath(draft).autoUnits).toBe('10 units')
    })
})

describe('StandardSolve.onFieldChanged', () => {
    it('refreshes concentration from the new compound amount on compoundAmount edits', () => {
        const draft: LabelModelInput = {
            compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2', concentration: '10mg per ml', calculatorSolveMode: 'standard',
        }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'compoundAmount', value: '10' }, 3)
        expect(next.compoundAmount).toBe('10')
        expect(next.concentration).toBe('5mg per ml')
        expect(next.reconstitutionAmount).toBe('2')
    })

    it('clears a stale draw-units leftover and refreshes concentration on water edits', () => {
        const draft: LabelModelInput = {
            compoundAmount: '20', vialUnit: 'mg', protocolUnits: '50 units', concentration: '20mg per ml', calculatorSolveMode: 'standard',
        }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'water', value: '2' }, 3)
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.concentration).toBe('10mg per ml')
        expect(next.protocolUnits).toBe('')
    })

    it('keeps existing draw units when water is cleared', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', protocolUnits: '10 units', calculatorSolveMode: 'standard' }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'water', value: '' }, 3)
        expect(next.reconstitutionAmount).toBe('')
        expect(next.protocolUnits).toBe('10 units')
    })

    it('clears draw units on protocolAmount edits', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', protocolUnits: '10 units', calculatorSolveMode: 'standard' }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'protocolAmount', value: '3' }, 3)
        expect(next.protocolAmount).toBe('3')
        expect(next.protocolUnits).toBe('')
    })

    it('sets draw units as user-authored and clears stale water', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2', calculatorSolveMode: 'standard' }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'protocolUnits', value: '15 units' }, 3)
        expect(next.protocolUnits).toBe('15 units')
        expect(next.protocolUnitsOrigin).toBe('user')
        expect(next.reconstitutionAmount).toBe('')
    })

    it('marks draw units as recommended (origin reset) when cleared, without touching water', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', protocolUnits: '15 units', calculatorSolveMode: 'standard' }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'protocolUnits', value: '' }, 3)
        expect(next.protocolUnits).toBe('')
        expect(next.protocolUnitsOrigin).toBe('recommended')
        expect(next.reconstitutionAmount).toBeUndefined()
    })

    it('refreshes concentration from current water when entering Manual Entry', () => {
        const draft: LabelModelInput = {
            compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2', concentration: '20mg per ml', calculatorSolveMode: 'target_units',
        }
        const next = StandardSolve.onFieldChanged(draft, { kind: 'mode', oldDerived: { autoUnits: '', autoWater: '', autoConcentration: '' }, outgoingWaterFollowsDrawUnits: true }, 3)
        expect(next.calculatorSolveMode).toBe('standard')
        expect(next.concentration).toBe('10mg per ml')
    })

    it('leaves the draft unchanged for fields Manual Entry does not react to', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', calculatorSolveMode: 'standard' }
        expect(StandardSolve.onFieldChanged(draft, { kind: 'vialUnit' }, 3)).toBe(draft)
        expect(StandardSolve.onFieldChanged(draft, { kind: 'measureUnit' }, 3)).toBe(draft)
        expect(StandardSolve.onFieldChanged(draft, { kind: 'targetConcentration' }, 3)).toBe(draft)
        expect(StandardSolve.onFieldChanged(draft, { kind: 'vialCapacity' }, 3)).toBe(draft)
    })
})

describe('StandardSolve.recommendDefaults', () => {
    it('never recommends a value for any field — every field is user-authored', () => {
        const draft: LabelModelInput = { compoundAmount: '', calculatorSolveMode: 'standard' }
        const fields: Array<Parameters<typeof StandardSolve.recommendDefaults>[2]> = [
            'vialUnit', 'compoundAmount', 'water', 'protocolAmount', 'measureUnit',
            'protocolUnits', 'mode', 'targetConcentration', 'vialCapacity',
        ]
        for (const field of fields) {
            expect(StandardSolve.recommendDefaults(draft, 3, field)).toEqual({})
        }
    })
})
