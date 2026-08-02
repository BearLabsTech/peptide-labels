import { resolveLabelMath } from './LabelMathResolver'
import {
    DEFAULT_CALCULATOR_SOLVE_MODE,
    ensureReconstitutionPrintForAssist,
} from './calculatorModeSwitch'
import type { LabelModelInput, LabelModelPatch } from './labelModel'
import {
    hasPositiveDrawUnits,
    hasPositiveVialAmount,
    resolveDefaultDrawUnitsLabel,
    resolveDefaultTargetConcentration,
} from './peptideMath'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'

export type SyncAssistReason = 'protocol' | 'vial' | 'measure' | 'draw' | 'mode'
    | 'target_concentration' | 'capacity'

export function resolveAssistModeUpdates(
    draft: LabelModelInput,
    reason: SyncAssistReason = 'mode',
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): LabelModelPatch {
    const mode = draft.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE
    if (mode !== 'target_units' && mode !== 'round_concentration') return {}

    const updates: LabelModelPatch = {}
    if (!hasPositiveVialAmount(draft.compoundAmount)) {
        updates.reconstitutionAmount = ''
        updates.concentration = ''
        if (mode === 'target_units' && draft.protocolAmount?.trim() && reason !== 'draw') {
            const protocolUnits = resolveDefaultDrawUnitsLabel(
                draft.protocolAmount,
                draft.measureUnit,
                draft.vialUnit,
                draft.compoundAmount,
                vialCapacityMl,
            )
            if (protocolUnits) {
                updates.protocolUnits = protocolUnits
                updates.protocolUnitsOrigin = 'recommended'
            }
        }
        return updates
    }

    let resolvedDraft = draft
    const shouldRecommendTarget = mode === 'round_concentration' && (
        !draft.targetConcentration?.trim()
        || (reason === 'capacity' && draft.targetConcentrationOrigin === 'recommended')
    )
    if (shouldRecommendTarget) {
        const recommendationInput = reason === 'capacity'
            ? { ...draft, concentration: '', reconstitutionAmount: '' }
            : draft
        const targetConcentration = resolveDefaultTargetConcentration(
            recommendationInput,
            vialCapacityMl,
        )
        updates.targetConcentration = targetConcentration
        updates.targetConcentrationOrigin = 'recommended'
        resolvedDraft = {
            ...draft,
            targetConcentration,
            targetConcentrationOrigin: 'recommended',
        }
    }

    if (mode === 'target_units' && reason !== 'draw') {
        const protocolUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount,
            draft.measureUnit,
            draft.vialUnit,
            draft.compoundAmount,
            vialCapacityMl,
        )
        const dependencyChanged = reason === 'protocol' || reason === 'vial'
            || reason === 'measure' || reason === 'capacity'
        const shouldUpdateDraw = !hasPositiveDrawUnits(draft.protocolUnits)
            || (dependencyChanged && draft.protocolUnitsOrigin === 'recommended')
        if (protocolUnits && shouldUpdateDraw) {
            updates.protocolUnits = protocolUnits
            updates.protocolUnitsOrigin = 'recommended'
            resolvedDraft = {
                ...resolvedDraft,
                protocolUnits,
                protocolUnitsOrigin: 'recommended',
            }
        }
    }

    const resolved = resolveLabelMath(resolvedDraft)
    if (resolved.autoWater) updates.reconstitutionAmount = resolved.autoWater
    if (resolved.autoConcentration) updates.concentration = resolved.autoConcentration
    Object.assign(
        updates,
        ensureReconstitutionPrintForAssist(mode, resolved, resolvedDraft),
    )

    if (mode === 'round_concentration' && resolved.autoUnits) {
        updates.protocolUnits = resolved.autoUnits
        updates.protocolUnitsOrigin = resolvedDraft.targetConcentrationOrigin === 'recommended'
            ? 'recommended'
            : 'user'
    }
    return updates
}
