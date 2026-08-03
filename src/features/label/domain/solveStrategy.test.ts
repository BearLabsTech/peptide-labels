import { describe, expect, it } from 'vitest'
import { SOLVE_STRATEGIES } from './solveStrategy'
import { StandardSolve } from './standardSolve'
import { TargetUnitsSolve } from './targetUnitsSolve'
import { RoundConcentrationSolve } from './roundConcentrationSolve'

describe('SOLVE_STRATEGIES registry', () => {
    it('is frozen so a caller cannot rebind a mode to a different strategy', () => {
        expect(Object.isFrozen(SOLVE_STRATEGIES)).toBe(true)
        expect(() => {
            SOLVE_STRATEGIES.standard = TargetUnitsSolve
        }).toThrow()
    })

    it('keys every mode to the strategy whose id matches that key', () => {
        expect(SOLVE_STRATEGIES.standard).toBe(StandardSolve)
        expect(SOLVE_STRATEGIES.target_units).toBe(TargetUnitsSolve)
        expect(SOLVE_STRATEGIES.round_concentration).toBe(RoundConcentrationSolve)
        for (const [mode, strategy] of Object.entries(SOLVE_STRATEGIES)) {
            expect(strategy.id).toBe(mode)
        }
    })

    it('never throws "not supported" for any method on any mode (Liskov)', () => {
        const draft = { compoundAmount: '20', vialUnit: 'mg' as const }
        for (const strategy of Object.values(SOLVE_STRATEGIES)) {
            expect(() => strategy.deriveMath(draft)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'compoundAmount', value: '10' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'vialUnit' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'water', value: '2' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'protocolAmount', value: '2' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'measureUnit' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'protocolUnits', value: '5 units' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(
                draft,
                {
                    kind: 'mode',
                    oldDerived: { autoUnits: '', autoWater: '', autoConcentration: '' },
                    outgoingWaterFollowsDrawUnits: false,
                },
                3,
            )).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'targetConcentration' }, 3)).not.toThrow()
            expect(() => strategy.onFieldChanged(draft, { kind: 'vialCapacity' }, 3)).not.toThrow()
            expect(() => strategy.recommendDefaults(draft, 3, 'compoundAmount')).not.toThrow()
        }
    })
})
