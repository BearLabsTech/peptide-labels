import { describe, expect, it } from 'vitest'
import { RoundConcentrationSolve } from './roundConcentrationSolve'
import type { LabelModelInput } from '../labelModel'

describe('RoundConcentrationSolve.deriveMath', () => {
    it('derives exact water from compound amount and target concentration', () => {
        const draft: LabelModelInput = { compoundAmount: '22', vialUnit: 'mg', protocolAmount: '4', measureUnit: 'mg', targetConcentration: '15' }
        const result = RoundConcentrationSolve.deriveMath(draft)
        expect(result.autoWater).toBe('1.467')
        expect(result.autoConcentration).toBe('15mg per ml')
    })

    it('falls back to the shared generic math when no target concentration is set', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2' }
        expect(RoundConcentrationSolve.deriveMath(draft).autoConcentration).toBe('10mg per ml')
    })
})

describe('RoundConcentrationSolve.onFieldChanged', () => {
    it('clears water and draw units on protocolAmount edits', () => {
        const draft: LabelModelInput = {
            compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2', protocolUnits: '15 units',
            targetConcentration: '10', calculatorSolveMode: 'round_concentration',
        }
        const next = RoundConcentrationSolve.onFieldChanged(draft, { kind: 'protocolAmount', value: '3' }, 3)
        expect(next.protocolAmount).toBe('3')
        expect(next.reconstitutionAmount).toBe('')
        expect(next.protocolUnits).toBe('')
    })

    it('vetoes direct water edits entirely — the draft is returned unchanged', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', targetConcentration: '10', calculatorSolveMode: 'round_concentration' }
        expect(RoundConcentrationSolve.onFieldChanged(draft, { kind: 'water', value: '5' }, 3)).toBe(draft)
    })

    it('vetoes direct draw-volume edits entirely — the draft is returned unchanged', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', targetConcentration: '10', calculatorSolveMode: 'round_concentration' }
        expect(RoundConcentrationSolve.onFieldChanged(draft, { kind: 'protocolUnits', value: '15 units' }, 3)).toBe(draft)
    })

    it('regenerates the target-concentration recommendation only while it is still system-owned', () => {
        const generated: LabelModelInput = {
            compoundAmount: '100', vialUnit: 'mg', recommendedTargetConcentration: '10', calculatorSolveMode: 'round_concentration',
        }
        const next = RoundConcentrationSolve.onFieldChanged(generated, { kind: 'vialCapacity' }, 3)
        expect(next.recommendedTargetConcentration).toBe('33.334')
        expect(next.targetConcentration).toBeUndefined()

        const userAuthored: LabelModelInput = {
            ...generated,
            targetConcentration: '10',
            recommendedTargetConcentration: '',
        }
        const unchanged = RoundConcentrationSolve.onFieldChanged(userAuthored, { kind: 'vialCapacity' }, 3)
        expect(unchanged).toBe(userAuthored)
    })

    it('recommends a fresh target concentration from the compound amount when entering with none set', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '1', calculatorSolveMode: 'standard' }
        const next = RoundConcentrationSolve.onFieldChanged(
            draft,
            { kind: 'mode', oldDerived: { autoUnits: '', autoWater: '', autoConcentration: '' }, outgoingWaterFollowsDrawUnits: false },
            3,
        )
        expect(next.calculatorSolveMode).toBe('round_concentration')
        // No `concentration` label authored, so the recommendation falls back to
        // vial ÷ water — 20 mg over 1 ml water.
        expect(next.recommendedTargetConcentration).toBe('20')
        expect(next.targetConcentration).toBeUndefined()
    })

    it('does not reuse a rounded generated draw concentration as a new target when entering from Set Draw Volume', () => {
        const generatedDraw: LabelModelInput = {
            compoundAmount: '100', vialUnit: 'mg', protocolAmount: '1', measureUnit: 'mg',
            recommendedProtocolUnits: '3 units', concentration: '33.333mg per ml',
            calculatorSolveMode: 'target_units',
        }
        const next = RoundConcentrationSolve.onFieldChanged(
            generatedDraw,
            { kind: 'mode', oldDerived: { autoUnits: '', autoWater: '', autoConcentration: '33.333mg per ml' }, outgoingWaterFollowsDrawUnits: true },
            3,
        )
        expect(next.recommendedTargetConcentration).toBe('33.334')
        expect(next.targetConcentration).toBeUndefined()
    })
})

describe('RoundConcentrationSolve.recommendDefaults', () => {
    it('recomputes water/units from the target concentration', () => {
        const draft: LabelModelInput = {
            compoundAmount: '22', vialUnit: 'mg', protocolAmount: '4', measureUnit: 'mg', targetConcentration: '15', calculatorSolveMode: 'round_concentration',
        }
        const patch = RoundConcentrationSolve.recommendDefaults(draft, 3, 'targetConcentration')
        expect(patch.reconstitutionAmount).toBe('1.467')
        expect(patch.concentration).toBe('15mg per ml')
        expect(patch.recommendedProtocolUnits).toBe('26.667 units')
        expect(patch.protocolUnits).toBeUndefined()
    })

    it('clears water/concentration when the compound amount is empty', () => {
        const draft: LabelModelInput = { compoundAmount: '', calculatorSolveMode: 'round_concentration' }
        const patch = RoundConcentrationSolve.recommendDefaults(draft, 3, 'compoundAmount')
        expect(patch.reconstitutionAmount).toBe('')
        expect(patch.concentration).toBe('')
    })

    it('is a no-op for a raw water edit — Set Concentration never recomputes from it', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', targetConcentration: '10', calculatorSolveMode: 'round_concentration' }
        expect(RoundConcentrationSolve.recommendDefaults(draft, 3, 'water')).toEqual({})
    })

    it('is a no-op for a raw draw-volume edit — Set Concentration never recomputes from it', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', targetConcentration: '10', calculatorSolveMode: 'round_concentration' }
        expect(RoundConcentrationSolve.recommendDefaults(draft, 3, 'protocolUnits')).toEqual({})
    })
})
