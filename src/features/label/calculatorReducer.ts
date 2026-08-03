import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { resolveCalculatorMode } from './peptideMath'
import {
    applyCalculatorModeSwitch,
    applyProtocolAmountChange,
    applyStandardModeEntry,
    applyStandardVialAmountChange,
    applyStandardWaterChange,
    applyVialCapacityRecommendationChange,
    protocolUnitsPatch,
    targetConcentrationPatch,
} from './calculatorModeSwitch'
import { resolveLabelMath } from './LabelMathResolver'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'
import { resolveAssistModeUpdates } from './calculatorAssistSync'
import { parseMeasureUnit, parseVialUnit } from './domain/units'

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
    | { readonly type: 'DrawVolumeChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'ModeChanged'; readonly mode: CalculatorSolveMode; readonly vialCapacityMl?: number }
    | { readonly type: 'TargetConcentrationChanged'; readonly value: string; readonly vialCapacityMl?: number }
    | { readonly type: 'VialCapacityChanged'; readonly vialCapacityMl: number }

/**
 * Pure state transition for every calculator input. Replaces the nine
 * `createLabelFormHandlers` closures (each of which re-derived mode and
 * branched on it) with one function that computes the complete next state
 * in a single step — there is no window where a caller can observe a
 * partially-applied transition.
 */
export function calculatorReducer(state: LabelModelInput, event: CalculatorEvent): LabelModelInput {
    switch (event.type) {
        case 'VialUnitChanged': {
            const vialUnit = parseVialUnit(event.unit)
            if (vialUnit === undefined) return state
            const measureUnit = vialUnit === 'IU'
                ? 'IU'
                : state.measureUnit === 'IU'
                    ? 'mcg'
                    : state.measureUnit
            const next: LabelModelInput = { ...state, vialUnit, measureUnit }
            const mode = resolveCalculatorMode(state)
            if (mode === 'target_units' || mode === 'round_concentration') {
                const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
                return { ...next, ...resolveAssistModeUpdates(next, 'vial', vialCapacityMl) }
            }
            return next
        }

        case 'CompoundAmountChanged': {
            const mode = resolveCalculatorMode(state)
            if (mode === 'standard') {
                return { ...state, ...applyStandardVialAmountChange(state, event.value) }
            }
            const next: LabelModelInput = { ...state, compoundAmount: event.value }
            if (mode === 'target_units' || mode === 'round_concentration') {
                const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
                return { ...next, ...resolveAssistModeUpdates(next, 'vial', vialCapacityMl) }
            }
            return next
        }

        case 'WaterChanged': {
            const mode = resolveCalculatorMode(state)
            if (mode === 'round_concentration') return state
            if (mode === 'standard') {
                return { ...state, ...applyStandardWaterChange(state, event.value) }
            }
            const next: LabelModelInput = { ...state, reconstitutionAmount: event.value }
            return event.value ? { ...next, protocolUnits: '' } : next
        }

        case 'ProtocolAmountChanged': {
            const mode = resolveCalculatorMode(state)
            const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
            const updates = applyProtocolAmountChange(state, event.value, vialCapacityMl)
            const next: LabelModelInput = { ...state, ...updates }
            if (mode === 'round_concentration' || mode === 'target_units') {
                return { ...next, ...resolveAssistModeUpdates(next, 'protocol', vialCapacityMl) }
            }
            return next
        }

        case 'MeasureUnitChanged': {
            const measureUnit = parseMeasureUnit(event.unit)
            if (measureUnit === undefined) return state
            const next: LabelModelInput = { ...state, measureUnit }
            const mode = resolveCalculatorMode(state)
            if (mode === 'target_units' || mode === 'round_concentration') {
                const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
                return { ...next, ...resolveAssistModeUpdates(next, 'measure', vialCapacityMl) }
            }
            return next
        }

        case 'DrawVolumeChanged': {
            const mode = resolveCalculatorMode(state)
            if (mode === 'round_concentration') return state
            const patch = protocolUnitsPatch({ value: event.value, origin: event.value ? 'user' : 'recommended' })
            const next: LabelModelInput = { ...state, ...patch }
            if (mode === 'target_units') {
                const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
                const draft: LabelModelInput = { ...next, protocolUnits: event.value, reconstitutionAmount: '' }
                return { ...next, ...resolveAssistModeUpdates(draft, 'draw', vialCapacityMl) }
            }
            return event.value ? { ...next, reconstitutionAmount: '' } : next
        }

        case 'ModeChanged': {
            const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
            const derived = resolveLabelMath(state)
            const switched = applyCalculatorModeSwitch(state, event.mode, derived, vialCapacityMl)
            const merged: LabelModelInput = { ...state, ...switched }
            if (event.mode === 'standard') {
                return { ...merged, ...applyStandardModeEntry(merged) }
            }
            return { ...merged, ...resolveAssistModeUpdates(merged, 'mode', vialCapacityMl) }
        }

        case 'TargetConcentrationChanged': {
            const patch = targetConcentrationPatch({ value: event.value, origin: event.value ? 'user' : 'recommended' })
            const next: LabelModelInput = {
                ...state,
                ...patch,
                reconstitutionAmount: '',
                concentration: '',
                protocolUnits: '',
            }
            const mode = resolveCalculatorMode(state)
            if (mode === 'round_concentration') {
                const vialCapacityMl = event.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML
                return { ...next, ...resolveAssistModeUpdates(next, 'target_concentration', vialCapacityMl) }
            }
            return next
        }

        case 'VialCapacityChanged': {
            const mode = resolveCalculatorMode(state)
            if (mode !== 'target_units' && mode !== 'round_concentration') return state
            const recommendationUpdates = applyVialCapacityRecommendationChange(state, event.vialCapacityMl)
            const next: LabelModelInput = { ...state, ...recommendationUpdates }
            return { ...next, ...resolveAssistModeUpdates(next, 'capacity', event.vialCapacityMl) }
        }
    }
}
