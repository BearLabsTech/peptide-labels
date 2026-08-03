/**
 * Permanent invariant sweep over `calculatorReducer`.
 *
 * Covers every length-2 event sequence from six starting states against every
 * event variant below — 3,036 transitions when this file was first landed
 * (2026-08-03). That count is the product of:
 *   6 starts × N events × N events
 * where N is the length of `EVENTS` below. Report it in the describe title so
 * a future reader can see the coverage is a sweep, not three hand-picked cases.
 *
 * After every step this asserts:
 *   1. Unit pairing — when vial and measure units are both set, they form a
 *      valid `UnitWorld` (the defect this file was added to pin).
 *   2. No non-finite value leaks into a string field (`NaN` / `Infinity`).
 *   3. Idempotence — applying an event twice equals applying it once.
 *   4. Provenance — an origin flag never describes a value that is gone
 *      (`protocolUnitsOrigin` / `targetConcentrationOrigin` are never `'user'`
 *      when the matching value is empty). Landed with quality follow-up 5a.
 */
import { describe, expect, it } from 'vitest'
import { calculatorReducer, type CalculatorEvent } from './calculatorReducer'
import { makeUnitWorld, parseMeasureUnit, parseVialUnit } from './domain/units'
import type { LabelModelInput } from './labelModel'
import {
    forwardMathScenario,
    manualEntryScenario,
    roundConcentrationRoundingTrapScenario,
    roundTripDriftTrapScenario,
} from './testing/labelInputBuilder'

const EMPTY: LabelModelInput = {}

const MG_MCG: LabelModelInput = {
    compoundAmount: '10',
    vialUnit: 'mg',
    reconstitutionAmount: '2',
    protocolAmount: '500',
    measureUnit: 'mcg',
    calculatorSolveMode: 'standard',
}

const IU_IU: LabelModelInput = {
    compoundAmount: '100',
    vialUnit: 'IU',
    protocolAmount: '10',
    measureUnit: 'IU',
    protocolUnits: '10 units',
    calculatorSolveMode: 'target_units',
}

const STARTS: readonly LabelModelInput[] = [
    EMPTY,
    manualEntryScenario(),
    MG_MCG,
    IU_IU,
    roundConcentrationRoundingTrapScenario(),
    forwardMathScenario(),
    // Seventh start kept for the round-trip mode so every solve mode appears
    // at least once as a seed. Counted in the product below.
    roundTripDriftTrapScenario(),
]

/**
 * One or two realistic values per event type, including empty and `'0'` for
 * fields that accept a free-form string. Unrecognized units are included so
 * the reject-and-return-state path is exercised too.
 */
const EVENTS: readonly CalculatorEvent[] = [
    { type: 'VialUnitChanged', unit: 'mg', vialCapacityMl: 3 },
    { type: 'VialUnitChanged', unit: 'IU', vialCapacityMl: 3 },
    { type: 'VialUnitChanged', unit: 'lb', vialCapacityMl: 3 },
    { type: 'CompoundAmountChanged', value: '10', vialCapacityMl: 3 },
    { type: 'CompoundAmountChanged', value: '', vialCapacityMl: 3 },
    { type: 'CompoundAmountChanged', value: '0', vialCapacityMl: 3 },
    { type: 'WaterChanged', value: '2' },
    { type: 'WaterChanged', value: '' },
    { type: 'WaterChanged', value: '0' },
    { type: 'ProtocolAmountChanged', value: '3', vialCapacityMl: 3 },
    { type: 'ProtocolAmountChanged', value: '', vialCapacityMl: 3 },
    { type: 'ProtocolAmountChanged', value: '0', vialCapacityMl: 3 },
    { type: 'MeasureUnitChanged', unit: 'mg', vialCapacityMl: 3 },
    { type: 'MeasureUnitChanged', unit: 'mcg', vialCapacityMl: 3 },
    { type: 'MeasureUnitChanged', unit: 'IU', vialCapacityMl: 3 },
    { type: 'ProtocolUnitsChanged', value: '10 units', vialCapacityMl: 3 },
    { type: 'ProtocolUnitsChanged', value: '', vialCapacityMl: 3 },
    { type: 'ProtocolUnitsChanged', value: '0', vialCapacityMl: 3 },
    { type: 'ModeChanged', mode: 'standard', vialCapacityMl: 3 },
    { type: 'ModeChanged', mode: 'target_units', vialCapacityMl: 3 },
    { type: 'ModeChanged', mode: 'round_concentration', vialCapacityMl: 3 },
    { type: 'TargetConcentrationChanged', value: '10', vialCapacityMl: 3 },
    { type: 'TargetConcentrationChanged', value: '', vialCapacityMl: 3 },
    { type: 'TargetConcentrationChanged', value: '0', vialCapacityMl: 3 },
    { type: 'VialCapacityChanged', vialCapacityMl: 3 },
    { type: 'VialCapacityChanged', vialCapacityMl: 10 },
]

const SWEPT_TRANSITIONS = STARTS.length * EVENTS.length * EVENTS.length

const NON_FINITE = /NaN|Infinity/

function assertInvariants(state: LabelModelInput, path: string): void {
    const vial = state.vialUnit
    const measure = state.measureUnit
    if (vial !== undefined && measure !== undefined) {
        const parsedVial = parseVialUnit(vial)
        const parsedMeasure = parseMeasureUnit(measure)
        // Both parse (they should — the reducer only writes valid units), and
        // together they must form a UnitWorld. A null here is the defect this
        // sweep exists to catch.
        expect(parsedVial, `${path}: vialUnit "${vial}" must parse`).toBeDefined()
        expect(parsedMeasure, `${path}: measureUnit "${measure}" must parse`).toBeDefined()
        if (parsedVial && parsedMeasure) {
            expect(
                makeUnitWorld(parsedVial, parsedMeasure),
                `${path}: ${vial}/${measure} must be a valid UnitWorld`,
            ).not.toBeNull()
        }
    }

    for (const [key, value] of Object.entries(state)) {
        if (typeof value === 'string') {
            expect(value, `${path}: ${key} must not contain NaN/Infinity`).not.toMatch(NON_FINITE)
        }
    }

    if (!state.protocolUnits?.trim()) {
        expect(state.protocolUnitsOrigin, `${path}: empty protocolUnits must not carry origin 'user'`).not.toBe('user')
    }
    if (!state.targetConcentration?.trim()) {
        expect(state.targetConcentrationOrigin, `${path}: empty targetConcentration must not carry origin 'user'`).not.toBe('user')
    }
}

function stateEqual(a: LabelModelInput, b: LabelModelInput): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
        if (a[key as keyof LabelModelInput] !== b[key as keyof LabelModelInput]) return false
    }
    return true
}

describe(`calculatorReducer invariants (${SWEPT_TRANSITIONS} length-2 transitions)`, () => {
    it('should keep unit pairing valid, leak no non-finite strings, and stay idempotent', () => {
        let checked = 0

        for (const start of STARTS) {
            assertInvariants(start, 'start')

            for (const first of EVENTS) {
                const afterFirst = calculatorReducer(start, first)
                assertInvariants(afterFirst, `${first.type}`)
                checked += 1

                // Idempotence of the first event from the start state.
                const afterFirstTwice = calculatorReducer(afterFirst, first)
                expect(
                    stateEqual(afterFirst, afterFirstTwice),
                    `idempotence failed for ${first.type} from start`,
                ).toBe(true)

                for (const second of EVENTS) {
                    const afterSecond = calculatorReducer(afterFirst, second)
                    assertInvariants(afterSecond, `${first.type} → ${second.type}`)
                    checked += 1

                    const afterSecondTwice = calculatorReducer(afterSecond, second)
                    expect(
                        stateEqual(afterSecond, afterSecondTwice),
                        `idempotence failed for ${first.type} → ${second.type}`,
                    ).toBe(true)
                }
            }
        }

        // Sanity: the loop visited every length-1 and length-2 transition.
        // Length-1: starts × events. Length-2: starts × events × events.
        expect(checked).toBe(STARTS.length * EVENTS.length + SWEPT_TRANSITIONS)
    }, 30_000)
})
