import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { resolveCalculatorMode } from './peptideMath'
import { resolveLabelMath } from './LabelMathResolver'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'
import { makeUnitWorld, parseMeasureUnit, parseVialUnit } from './domain/units'
import { SOLVE_STRATEGIES, type CalculatorFieldEdit, type SolveStrategy } from './domain/solveStrategy'

/**
 * One event per calculator input the user can change. Each variant carries
 * exactly the raw data its original handler received — `vialCapacityMl` is
 * threaded explicitly (never closed over) so the reducer stays a pure
 * function of `(state, event)`, safe to unit test without any UI wiring.
 */
export type CalculatorEvent =
    | { readonly type: 'VialUnitChanged'; readonly unit: string; readonly vialCapacityMl?: number }
    | { readonly type: 'CompoundAmountChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'WaterChanged'; readonly value: string }
    | { readonly type: 'ProtocolAmountChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'MeasureUnitChanged'; readonly unit: string; readonly vialCapacityMl?: number }
    | { readonly type: 'ProtocolUnitsChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'ModeChanged'; readonly mode: CalculatorSolveMode; readonly vialCapacityMl?: number }
    | { readonly type: 'TargetConcentrationChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'VialCapacityChanged'; readonly vialCapacityMl: number }

/**
 * Runs one field edit through a strategy: an immediate, capacity-independent
 * reaction ({@link SolveStrategy.onFieldChanged}), then that mode's
 * capacity-dependent recommended defaults ({@link SolveStrategy.recommendDefaults}).
 * The caller picks the strategy — the current mode's for every field edit,
 * but the *incoming* mode's for a `mode` edit, since that edit is what makes
 * the new mode's strategy authoritative going forward.
 */
function applyFieldEdit(strategy: SolveStrategy, state: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput {
    const afterFieldChange = strategy.onFieldChanged(state, edit, vialCapacityMl)
    const patch = strategy.recommendDefaults(afterFieldChange, vialCapacityMl, edit.kind)
    // Preserve reference equality when nothing actually changed — several call
    // sites (and their tests) rely on a true no-op event returning the exact
    // same `state` object, not just a shallow-equal copy of it.
    return Object.keys(patch).length === 0 ? afterFieldChange : { ...afterFieldChange, ...patch }
}

/** Every non-mode field edit reacts through the mode `state` is currently in. */
function applyCurrentModeFieldEdit(state: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput {
    return applyFieldEdit(SOLVE_STRATEGIES[resolveCalculatorMode(state)], state, edit, vialCapacityMl)
}

/**
 * Pure state transition for every calculator input. Replaces the nine
 * `createLabelFormHandlers` closures (each of which re-derived mode and
 * branched on it) with one function that selects a {@link SolveStrategy}
 * once per event and delegates every mode-specific decision to it — there
 * is no window where a caller can observe a partially-applied transition.
 */
export function calculatorReducer(state: LabelModelInput, event: CalculatorEvent): LabelModelInput {
    switch (event.type) {
        case 'VialUnitChanged': {
            const vialUnit = parseVialUnit(event.unit)
            if (vialUnit === null) return state
            const measureUnit = vialUnit === 'IU'
                ? 'IU'
                : state.measureUnit === 'IU'
                    ? 'mcg'
                    : state.measureUnit
            const withUnit: LabelModelInput = { ...state, vialUnit, measureUnit }
            return applyCurrentModeFieldEdit(withUnit, { kind: 'vialUnit' }, event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML)
        }

        case 'CompoundAmountChanged':
            return applyCurrentModeFieldEdit(
                state,
                { kind: 'compoundAmount', value: event.value },
                event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
            )

        case 'WaterChanged':
            return applyCurrentModeFieldEdit(state, { kind: 'water', value: event.value }, DEFAULT_VIAL_CAPACITY_ML)

        case 'ProtocolAmountChanged':
            return applyCurrentModeFieldEdit(
                state,
                { kind: 'protocolAmount', value: event.value },
                event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
            )

        case 'MeasureUnitChanged': {
            const measureUnit = parseMeasureUnit(event.unit)
            if (measureUnit === null) return state
            // Mirrors VialUnitChanged, which already keeps the pairing valid.
            // makeUnitWorld is the single definition of which pairings exist.
            if (!makeUnitWorld(state.vialUnit ?? 'mg', measureUnit)) return state
            const withUnit: LabelModelInput = { ...state, measureUnit }
            return applyCurrentModeFieldEdit(withUnit, { kind: 'measureUnit' }, event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML)
        }

        case 'ProtocolUnitsChanged':
            return applyCurrentModeFieldEdit(
                state,
                { kind: 'protocolUnits', value: event.value },
                event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
            )

        case 'ModeChanged': {
            const oldDerived = resolveLabelMath(state)
            const outgoing = SOLVE_STRATEGIES[resolveCalculatorMode(state)]
            return applyFieldEdit(
                SOLVE_STRATEGIES[event.mode],
                state,
                {
                    kind: 'mode',
                    oldDerived,
                    outgoingWaterFollowsDrawUnits: outgoing.waterFollowsDrawUnitsRecommendation,
                },
                event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
            )
        }

        case 'TargetConcentrationChanged': {
            const withTarget: LabelModelInput = {
                ...state,
                targetConcentration: event.value,
                recommendedTargetConcentration: '',
                reconstitutionAmount: '',
                concentration: '',
                protocolUnits: '',
                recommendedProtocolUnits: '',
            }
            return applyCurrentModeFieldEdit(
                withTarget,
                { kind: 'targetConcentration' },
                event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
            )
        }

        case 'VialCapacityChanged':
            return applyCurrentModeFieldEdit(state, { kind: 'vialCapacity' }, event.vialCapacityMl)
    }
}
