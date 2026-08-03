import type { LabelModelInput, LabelModelPatch } from '../labelModel'
import {
    hasPositiveDrawUnits,
    hasPositiveVialAmount,
    resolveDefaultDrawUnitsLabel,
} from '../peptideMath'
import { ensureReconstitutionPrintForAssist, protocolUnitsPatch } from '../calculatorModeSwitch'
import { calcReverse, deriveGenericMath, hasVialAndProtocol, parseLabelMathInput, type ResolvedLabelMath } from './labelMathCore'
import type { CalculatorFieldEdit, CalculatorFieldKind, SolveStrategy } from './solveStrategy'

function deriveMath(draft: LabelModelInput): ResolvedLabelMath {
    const parsed = parseLabelMathInput(draft)
    if (hasVialAndProtocol(parsed) && parsed.drawUnits > 0) return calcReverse(parsed)
    return deriveGenericMath(parsed)
}

function onWaterChanged(draft: LabelModelInput, value: string): LabelModelInput {
    const next: LabelModelInput = { ...draft, reconstitutionAmount: value }
    return value ? { ...next, protocolUnits: '' } : next
}

function onProtocolAmountChanged(draft: LabelModelInput, value: string, vialCapacityMl: number): LabelModelInput {
    let next: LabelModelInput = { ...draft, protocolAmount: value, reconstitutionAmount: '' }
    const defaultUnits = resolveDefaultDrawUnitsLabel(value, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl)
    if (defaultUnits) {
        next = { ...next, ...protocolUnitsPatch({ value: defaultUnits, origin: 'recommended' }) }
    }
    return next
}

function onDrawVolumeChanged(draft: LabelModelInput, value: string): LabelModelInput {
    return { ...draft, ...protocolUnitsPatch({ value, origin: value ? 'user' : 'recommended' }) }
}

/**
 * Entering Set Draw Volume: recommend draw units when none exist yet.
 * The pre-2.6 code also fell back to the old mode's own derived draw units
 * when `resolveDefaultDrawUnitsLabel` came back empty, but that formula is
 * empty only when the protocol amount is missing or the unit pairing is
 * unrepresentable — both of which also make any mode's derived draw units
 * empty, so that fallback could never actually contribute a different
 * value and is dropped here rather than reintroducing a circular import
 * back through the registry to reach "the old mode's math."
 */
function onModeEntered(draft: LabelModelInput, vialCapacityMl: number): LabelModelInput {
    let next: LabelModelInput = { ...draft, calculatorSolveMode: 'target_units' }
    if (!hasPositiveDrawUnits(draft.protocolUnits)) {
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
        )
        if (defaultUnits) {
            next = { ...next, ...protocolUnitsPatch({ value: defaultUnits, origin: 'recommended' }) }
        }
    }
    return next
}

/** Regenerate the draw-units recommendation only while it is still system-owned. */
function onVialCapacityChanged(draft: LabelModelInput, vialCapacityMl: number): LabelModelInput {
    const canRegenerate = !hasPositiveDrawUnits(draft.protocolUnits) || draft.protocolUnitsOrigin === 'recommended'
    if (!canRegenerate) return draft
    const protocolUnits = resolveDefaultDrawUnitsLabel(
        draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
    )
    return protocolUnits ? { ...draft, ...protocolUnitsPatch({ value: protocolUnits, origin: 'recommended' }) } : draft
}

function onFieldChanged(draft: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput {
    switch (edit.kind) {
        case 'compoundAmount': return { ...draft, compoundAmount: edit.value }
        case 'water': return onWaterChanged(draft, edit.value)
        case 'protocolAmount': return onProtocolAmountChanged(draft, edit.value, vialCapacityMl)
        case 'drawVolume': return onDrawVolumeChanged(draft, edit.value)
        case 'mode': return onModeEntered(draft, vialCapacityMl)
        case 'vialCapacity': return onVialCapacityChanged(draft, vialCapacityMl)
        // vialUnit/measureUnit/targetConcentration: the reducer already applied the
        // mode-independent raw change; no further immediate reaction here (any
        // recommendation runs afterward in recommendDefaults).
        case 'vialUnit':
        case 'measureUnit':
        case 'targetConcentration':
            return draft
    }
}

function recommendDefaults(draft: LabelModelInput, vialCapacityMl: number, field: CalculatorFieldKind): LabelModelPatch {
    // Set Draw Volume never recomputes from a raw water edit (the field itself
    // is not authoritative here — see onWaterChanged) or a target-concentration
    // edit (that field belongs to Set Concentration); both are no-ops.
    if (field === 'water' || field === 'targetConcentration') return {}

    const updates: LabelModelPatch = {}
    if (!hasPositiveVialAmount(draft.compoundAmount)) {
        updates.reconstitutionAmount = ''
        updates.concentration = ''
        if (draft.protocolAmount?.trim() && field !== 'drawVolume') {
            const protocolUnits = resolveDefaultDrawUnitsLabel(
                draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
            )
            if (protocolUnits) Object.assign(updates, protocolUnitsPatch({ value: protocolUnits, origin: 'recommended' }))
        }
        return updates
    }

    let resolvedDraft = draft
    if (field !== 'drawVolume') {
        const protocolUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
        )
        const dependencyChanged = field === 'protocolAmount' || field === 'compoundAmount'
            || field === 'vialUnit' || field === 'measureUnit' || field === 'vialCapacity'
        const shouldUpdateDraw = !hasPositiveDrawUnits(draft.protocolUnits)
            || (dependencyChanged && draft.protocolUnitsOrigin === 'recommended')
        if (protocolUnits && shouldUpdateDraw) {
            const patch = protocolUnitsPatch({ value: protocolUnits, origin: 'recommended' })
            Object.assign(updates, patch)
            resolvedDraft = { ...resolvedDraft, ...patch }
        }
    } else {
        // The user just typed this exact field — compute water/concentration
        // from it directly rather than folding in a stale stored water value.
        resolvedDraft = { ...resolvedDraft, reconstitutionAmount: '' }
    }

    const resolved = deriveMath(resolvedDraft)
    if (resolved.autoWater) updates.reconstitutionAmount = resolved.autoWater
    if (resolved.autoConcentration) updates.concentration = resolved.autoConcentration
    Object.assign(updates, ensureReconstitutionPrintForAssist('target_units', resolved, resolvedDraft))

    return updates
}

export const TargetUnitsSolve: SolveStrategy = {
    id: 'target_units',
    deriveMath,
    onFieldChanged,
    recommendDefaults,
}
