import { describe, expect, it } from 'vitest'
import { TargetUnitsSolve } from './targetUnitsSolve'
import type { LabelModelInput } from '../labelModel'

describe('TargetUnitsSolve.deriveMath', () => {
    it('derives water/concentration from draw units when vial, protocol, and draw units are all present', () => {
        const draft: LabelModelInput = {
            compoundAmount: '22', vialUnit: 'mg', protocolAmount: '4', measureUnit: 'mg', protocolUnits: '27 units',
        }
        const result = TargetUnitsSolve.deriveMath(draft)
        expect(result.autoWater).toBe('1.485')
        expect(result.autoConcentration).toBe('14.815mg per ml')
    })

    it('falls back to the shared generic math when draw units are not yet known', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2' }
        expect(TargetUnitsSolve.deriveMath(draft).autoConcentration).toBe('10mg per ml')
    })
})

describe('TargetUnitsSolve.onFieldChanged', () => {
    it('recommends 10 units instead of zero when protocol amount is entered with no compound amount yet', () => {
        const draft: LabelModelInput = { compoundAmount: '', measureUnit: 'mg', calculatorSolveMode: 'target_units' }
        const next = TargetUnitsSolve.onFieldChanged(draft, { kind: 'protocolAmount', value: '3' }, 3)
        expect(next.recommendedProtocolUnits).toBe('10 units')
        expect(next.protocolUnits).toBeUndefined()
        expect(next.reconstitutionAmount).toBe('')
    })

    it('clears protocolUnits on water edits when a value is entered', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', protocolUnits: '15 units', calculatorSolveMode: 'target_units' }
        const next = TargetUnitsSolve.onFieldChanged(draft, { kind: 'water', value: '2' }, 3)
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.protocolUnits).toBe('')
    })

    it('treats draw units as user-authored on drawVolume edits', () => {
        const draft: LabelModelInput = { compoundAmount: '22', vialUnit: 'mg', protocolAmount: '4', measureUnit: 'mg', calculatorSolveMode: 'target_units' }
        const next = TargetUnitsSolve.onFieldChanged(draft, { kind: 'protocolUnits', value: '27 units' }, 3)
        expect(next.protocolUnits).toBe('27 units')
        expect(next.recommendedProtocolUnits).toBe('')
    })

    it('regenerates the draw-units recommendation only while it is still system-owned', () => {
        const generated: LabelModelInput = {
            compoundAmount: '100', vialUnit: 'mg', protocolAmount: '1', measureUnit: 'mg',
            recommendedProtocolUnits: '10 units', calculatorSolveMode: 'target_units',
        }
        const next = TargetUnitsSolve.onFieldChanged(generated, { kind: 'vialCapacity' }, 3)
        expect(next.recommendedProtocolUnits).toBe('3 units')
        expect(next.protocolUnits).toBeUndefined()

        const userAuthored: LabelModelInput = {
            ...generated,
            protocolUnits: '10 units',
            recommendedProtocolUnits: '',
        }
        const unchanged = TargetUnitsSolve.onFieldChanged(userAuthored, { kind: 'vialCapacity' }, 3)
        expect(unchanged).toBe(userAuthored)
    })

    it('recommends draw units when entering Set Draw Volume with none yet', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', protocolAmount: '3', measureUnit: 'mg', calculatorSolveMode: 'standard' }
        const next = TargetUnitsSolve.onFieldChanged(
            draft,
            { kind: 'mode', oldDerived: { autoUnits: '', autoWater: '', autoConcentration: '' }, outgoingWaterFollowsDrawUnits: false },
            3,
        )
        expect(next.calculatorSolveMode).toBe('target_units')
        expect(next.recommendedProtocolUnits).toBeTruthy()
        expect(next.protocolUnits).toBeUndefined()
    })
})

describe('TargetUnitsSolve.recommendDefaults', () => {
    it('recomputes water/units when compound amount changes, keeping printable fields visible', () => {
        const draft: LabelModelInput = {
            compoundAmount: '20', vialUnit: 'mg', protocolAmount: '2', measureUnit: 'mg', protocolUnits: '', calculatorSolveMode: 'target_units',
        }
        const patch = TargetUnitsSolve.recommendDefaults(draft, 3, 'compoundAmount')
        expect(patch.recommendedProtocolUnits).toBe('20 units')
        expect(patch.protocolUnits).toBeUndefined()
        expect(patch.reconstitutionAmount).toBe('2')
        expect(patch.concentration).toBe('10mg per ml')
        expect(patch.showReconstitution).toBe(true)
    })

    it('clears assist results and recommends a flat draw placeholder when the compound amount is empty', () => {
        const draft: LabelModelInput = { compoundAmount: '', protocolAmount: '1', measureUnit: 'mg', calculatorSolveMode: 'target_units' }
        const patch = TargetUnitsSolve.recommendDefaults(draft, 3, 'compoundAmount')
        expect(patch.reconstitutionAmount).toBe('')
        expect(patch.concentration).toBe('')
        expect(patch.recommendedProtocolUnits).toBe('10 units')
        expect(patch.protocolUnits).toBeUndefined()
    })

    it('is a no-op for a raw water edit — Set Draw Volume never recomputes from it', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', reconstitutionAmount: '2', calculatorSolveMode: 'target_units' }
        expect(TargetUnitsSolve.recommendDefaults(draft, 3, 'water')).toEqual({})
    })

    it('is a no-op for a targetConcentration edit — that field belongs to Set Concentration', () => {
        const draft: LabelModelInput = { compoundAmount: '20', vialUnit: 'mg', targetConcentration: '10', calculatorSolveMode: 'target_units' }
        expect(TargetUnitsSolve.recommendDefaults(draft, 3, 'targetConcentration')).toEqual({})
    })
})
