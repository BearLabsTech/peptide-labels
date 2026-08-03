import { resolveLabelMath } from './LabelMathResolver'
import { ensureReconstitutionPrintForAssist, protocolUnitsPatch, targetConcentrationPatch } from './calculatorModeSwitch'
import type { LabelModelInput, LabelModelPatch } from './labelModel'
import {
    hasPositiveDrawUnits,
    hasPositiveVialAmount,
    resolveCalculatorMode,
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
    const mode = resolveCalculatorMode(draft)
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
                Object.assign(updates, protocolUnitsPatch({ value: protocolUnits, origin: 'recommended' }))
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
        const targetConcentration = targetConcentrationPatch({
            value: resolveDefaultTargetConcentration(recommendationInput, vialCapacityMl),
            origin: 'recommended',
        })
        Object.assign(updates, targetConcentration)
        resolvedDraft = { ...draft, ...targetConcentration }
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
            const patch = protocolUnitsPatch({ value: protocolUnits, origin: 'recommended' })
            Object.assign(updates, patch)
            resolvedDraft = { ...resolvedDraft, ...patch }
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
        Object.assign(updates, protocolUnitsPatch({
            value: resolved.autoUnits,
            origin: resolvedDraft.targetConcentrationOrigin === 'recommended' ? 'recommended' : 'user',
        }))
    }
    return updates
}
