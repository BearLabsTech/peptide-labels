import type { LabelModelInput, LabelModelPatch } from '../labelModel'
import {
    hasPositiveCompoundAmount,
    hasPositiveDrawUnits,
    resolveDefaultTargetConcentration,
    calculateWaterFromTargetConcentration,
    parseNumericField,
} from '../peptideMath'
import { ensureReconstitutionPrintForAssist, protocolUnitsPatch, targetConcentrationPatch } from '../calculatorModeSwitch'
import {
    calcFromConcentration,
    calcWaterFromTargetConcentration,
    deriveGenericMath,
    hasProtocolAmount,
    hasCompoundAmount,
    parseLabelMathInput,
    type ResolvedLabelMath,
} from './labelMathCore'
import type { CalculatorFieldEdit, CalculatorFieldKind, SolveStrategy } from './solveStrategy'

function deriveMath(draft: LabelModelInput): ResolvedLabelMath {
    const parsed = parseLabelMathInput(draft)
    if (hasCompoundAmount(parsed) && parsed.targetConcentration > 0) {
        if (hasProtocolAmount(parsed)) return calcFromConcentration(draft, parsed)
        return calcWaterFromTargetConcentration(parsed)
    }
    return deriveGenericMath(parsed)
}

function onProtocolAmountChanged(draft: LabelModelInput, value: string): LabelModelInput {
    return {
        ...draft,
        protocolAmount: value,
        reconstitutionAmount: '',
        ...protocolUnitsPatch({ value: '', origin: 'recommended' }),
    }
}

/**
 * Entering Set Concentration: recommend a target concentration when none
 * exists yet. Prefers the already-authored `concentration` label; when that
 * is empty, prefers the outgoing mode's own derived concentration over a
 * blind vial ÷ stored-water ratio, since when `outgoingWaterFollowsDrawUnits`
 * is true the stored water/concentration may be a by-product of a draw-units
 * recommendation about to be discarded — using the outgoing mode's exact
 * derived concentration (not the stored, possibly-generated water) avoids
 * seeding the new target from values tied to that recommendation.
 */
function onModeEntered(
    draft: LabelModelInput,
    vialCapacityMl: number,
    oldDerived: ResolvedLabelMath,
    outgoingWaterFollowsDrawUnits: boolean,
): LabelModelInput {
    let next: LabelModelInput = { ...draft, calculatorSolveMode: 'round_concentration' }
    const canRecommendTarget = hasPositiveCompoundAmount(draft.compoundAmount) || Boolean(draft.concentration?.trim())
    if (!draft.targetConcentration?.trim() && canRecommendTarget) {
        const generatedDrawSource = outgoingWaterFollowsDrawUnits
            && hasPositiveDrawUnits(draft.protocolUnits)
            && draft.protocolUnitsOrigin === 'recommended'
        const recommendationInput = generatedDrawSource
            ? { compoundAmount: draft.compoundAmount }
            : { ...draft, concentration: draft.concentration || oldDerived.autoConcentration }
        next = {
            ...next,
            ...targetConcentrationPatch({
                value: resolveDefaultTargetConcentration(recommendationInput, vialCapacityMl),
                origin: 'recommended',
            }),
        }
    }
    return next
}

/** Regenerate the target-concentration recommendation only while it is still system-owned. */
function onVialCapacityChanged(draft: LabelModelInput, vialCapacityMl: number): LabelModelInput {
    const canRegenerate = !draft.targetConcentration?.trim() || draft.targetConcentrationOrigin === 'recommended'
    if (!canRegenerate) return draft
    return {
        ...draft,
        ...targetConcentrationPatch({
            value: resolveDefaultTargetConcentration({ compoundAmount: draft.compoundAmount }, vialCapacityMl),
            origin: 'recommended',
        }),
    }
}

function onFieldChanged(draft: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput {
    switch (edit.kind) {
        case 'compoundAmount': return { ...draft, compoundAmount: edit.value }
        case 'protocolAmount': return onProtocolAmountChanged(draft, edit.value)
        case 'mode': return onModeEntered(draft, vialCapacityMl, edit.oldDerived, edit.outgoingWaterFollowsDrawUnits)
        case 'vialCapacity': return onVialCapacityChanged(draft, vialCapacityMl)
        // water/drawVolume: Set Concentration is solved from target concentration
        // alone — direct edits to either are not authoritative here, so the mode
        // vetoes them outright (the field keeps whatever value it already had).
        // vialUnit/measureUnit/targetConcentration: the reducer already applied the
        // mode-independent raw change; any recommendation runs afterward in
        // recommendDefaults.
        case 'water':
        case 'protocolUnits':
        case 'vialUnit':
        case 'measureUnit':
        case 'targetConcentration':
            return draft
    }
}

function recommendDefaults(draft: LabelModelInput, vialCapacityMl: number, field: CalculatorFieldKind): LabelModelPatch {
    // water/drawVolume are vetoed outright in onFieldChanged above (the draft
    // is unchanged); recommending anything from that unchanged draft would
    // resurrect a computation the original event never triggered.
    if (field === 'water' || field === 'protocolUnits') return {}

    const updates: LabelModelPatch = {}
    if (!hasPositiveCompoundAmount(draft.compoundAmount)) {
        updates.reconstitutionAmount = ''
        updates.concentration = ''
        return updates
    }

    let resolvedDraft = draft
    const shouldRecommendTarget = !draft.targetConcentration?.trim()
        || (field === 'vialCapacity' && draft.targetConcentrationOrigin === 'recommended')
    if (shouldRecommendTarget) {
        const recommendationInput = field === 'vialCapacity'
            ? { ...draft, concentration: '', reconstitutionAmount: '' }
            : draft
        const targetConcentration = targetConcentrationPatch({
            value: resolveDefaultTargetConcentration(recommendationInput, vialCapacityMl),
            origin: 'recommended',
        })
        Object.assign(updates, targetConcentration)
        resolvedDraft = { ...draft, ...targetConcentration }
    }

    const resolved = deriveMath(resolvedDraft)
    if (resolved.autoWater) updates.reconstitutionAmount = resolved.autoWater
    if (resolved.autoConcentration) updates.concentration = resolved.autoConcentration
    Object.assign(updates, ensureReconstitutionPrintForAssist(resolved, resolvedDraft))

    if (resolved.autoUnits) {
        Object.assign(updates, protocolUnitsPatch({
            value: resolved.autoUnits,
            origin: resolvedDraft.targetConcentrationOrigin === 'recommended' ? 'recommended' : 'user',
        }))
    }
    return updates
}

function requiredWaterMl(input: LabelModelInput): number | null {
    const compoundAmount = parseFloat(input.compoundAmount || '')
    if (!(compoundAmount > 0)) return null
    return calculateWaterFromTargetConcentration(compoundAmount, parseNumericField(input.targetConcentration))
}

export const RoundConcentrationSolve: SolveStrategy = {
    id: 'round_concentration',
    authoritativeField: 'targetConcentration',
    waterIsDerived: true,
    drawUnitsAreDerived: true,
    waterFollowsDrawUnitsRecommendation: false,
    requiredWaterMl,
    deriveMath,
    onFieldChanged,
    recommendDefaults,
}
