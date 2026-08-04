import type { LabelModelInput, LabelModelPatch } from '../labelModel'
import {
    DEFAULT_CALCULATOR_SOLVE_MODE,
    hasPositiveCompoundAmount,
    resolveDefaultDrawUnitsLabel,
    calculateReverseWater,
    parseNumericField,
    resolveMeasureUnit,
} from '../peptideMath'
import { ensureReconstitutionPrintForAssist, recommendedProtocolUnitsPatch } from '../calculatorModeSwitch'
import { calcReverse, deriveGenericMath, hasCompoundAndProtocol, parseLabelMathInput, type ResolvedLabelMath } from './labelMathCore'
import type { CalculatorFieldEdit, CalculatorFieldKind, SolveStrategy } from './solveStrategy'
import { makeUnitWorld } from './units'

function deriveMath(draft: LabelModelInput): ResolvedLabelMath {
    const parsed = parseLabelMathInput(draft)
    if (hasCompoundAndProtocol(parsed) && parsed.drawUnits > 0) return calcReverse(parsed)
    return deriveGenericMath(parsed)
}

function onWaterChanged(draft: LabelModelInput, value: string): LabelModelInput {
    const next: LabelModelInput = { ...draft, reconstitutionAmount: value }
    return value
        ? { ...next, protocolUnits: '', recommendedProtocolUnits: '' }
        : next
}

function onProtocolAmountChanged(draft: LabelModelInput, value: string, vialCapacityMl: number): LabelModelInput {
    let next: LabelModelInput = { ...draft, protocolAmount: value, reconstitutionAmount: '' }
    if (draft.protocolUnits?.trim()) {
        return { ...next, recommendedProtocolUnits: '' }
    }
    const defaultUnits = resolveDefaultDrawUnitsLabel(value, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl)
    if (defaultUnits) {
        next = { ...next, ...recommendedProtocolUnitsPatch(defaultUnits) }
    }
    return next
}

function onProtocolUnitsChanged(draft: LabelModelInput, value: string): LabelModelInput {
    return { ...draft, protocolUnits: value, recommendedProtocolUnits: '' }
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
    let next: LabelModelInput = { ...draft, calculatorSolveMode: DEFAULT_CALCULATOR_SOLVE_MODE }
    if (!draft.protocolUnits?.trim() && !draft.recommendedProtocolUnits?.trim()) {
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
        )
        if (defaultUnits) {
            next = { ...next, ...recommendedProtocolUnitsPatch(defaultUnits) }
        }
    }
    return next
}

/** Regenerate the draw-units recommendation only while it is still system-owned. */
function onVialCapacityChanged(draft: LabelModelInput, vialCapacityMl: number): LabelModelInput {
    const canRegenerate = !draft.protocolUnits?.trim()
    if (!canRegenerate) return draft
    const protocolUnits = resolveDefaultDrawUnitsLabel(
        draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
    )
    return protocolUnits ? { ...draft, ...recommendedProtocolUnitsPatch(protocolUnits) } : draft
}

function onFieldChanged(draft: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput {
    switch (edit.kind) {
        case 'compoundAmount': return { ...draft, compoundAmount: edit.value }
        case 'water': return onWaterChanged(draft, edit.value)
        case 'protocolAmount': return onProtocolAmountChanged(draft, edit.value, vialCapacityMl)
        case 'protocolUnits': return onProtocolUnitsChanged(draft, edit.value)
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
    if (!hasPositiveCompoundAmount(draft.compoundAmount)) {
        updates.reconstitutionAmount = ''
        updates.concentration = ''
        if (draft.protocolAmount?.trim() && field !== 'protocolUnits' && !draft.protocolUnits?.trim()) {
            const protocolUnits = resolveDefaultDrawUnitsLabel(
                draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
            )
            if (protocolUnits) Object.assign(updates, recommendedProtocolUnitsPatch(protocolUnits))
        }
        return updates
    }

    let resolvedDraft = draft
    if (field !== 'protocolUnits') {
        const protocolUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount, vialCapacityMl,
        )
        const dependencyChanged = field === 'protocolAmount' || field === 'compoundAmount'
            || field === 'vialUnit' || field === 'measureUnit' || field === 'vialCapacity'
        const shouldUpdateDraw = (
            !draft.protocolUnits?.trim()
            && !draft.recommendedProtocolUnits?.trim()
        )
            || (
                dependencyChanged
                && !draft.protocolUnits?.trim()
            )
        if (protocolUnits && shouldUpdateDraw) {
            const patch = recommendedProtocolUnitsPatch(protocolUnits)
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
    Object.assign(updates, ensureReconstitutionPrintForAssist(resolved, resolvedDraft))

    return updates
}

function requiredWaterMl(input: LabelModelInput): number | null {
    const compoundAmount = parseFloat(input.compoundAmount || '')
    if (!(compoundAmount > 0)) return null
    const vialUnit = input.vialUnit || 'mg'
    const unitWorld = makeUnitWorld(vialUnit, resolveMeasureUnit(vialUnit, input.measureUnit))
    if (!unitWorld) return null
    return calculateReverseWater({
        compoundAmount,
        unitWorld,
        drawUnits: parseNumericField(input.protocolUnits || input.recommendedProtocolUnits),
        protocolAmount: parseFloat(input.protocolAmount || ''),
    })
}

export const TargetUnitsSolve: SolveStrategy = {
    id: DEFAULT_CALCULATOR_SOLVE_MODE,
    authoritativeField: 'drawUnits',
    waterIsDerived: true,
    drawUnitsAreDerived: false,
    waterFollowsDrawUnitsRecommendation: true,
    requiredWaterMl,
    deriveMath,
    onFieldChanged,
    recommendDefaults,
}
