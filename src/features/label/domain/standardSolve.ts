import type { LabelModelInput, LabelModelPatch } from '../labelModel'
import { parseNumericField } from '../peptideMath'
import { protocolUnitsPatch } from '../calculatorModeSwitch'
import { deriveGenericMath, parseLabelMathInput, type ResolvedLabelMath } from './labelMathCore'
import type { CalculatorFieldEdit, SolveStrategy } from './solveStrategy'

function deriveMath(draft: LabelModelInput): ResolvedLabelMath {
    return deriveGenericMath(parseLabelMathInput(draft))
}

/** Manual Entry water edit: clear draw units (forward math will refill) and
 * replace concentration from vial ÷ water — never keep a prior assist label. */
function onWaterChanged(draft: LabelModelInput, value: string): LabelModelInput {
    const protocolUnits = value ? '' : (draft.protocolUnits || '')
    const concentration = deriveMath({ ...draft, reconstitutionAmount: value, protocolUnits, concentration: '' }).autoConcentration
    return { ...draft, reconstitutionAmount: value, protocolUnits, concentration: concentration || '' }
}

/** Manual Entry vial edit: refresh concentration from vial ÷ current water. */
function onCompoundAmountChanged(draft: LabelModelInput, value: string): LabelModelInput {
    const concentration = deriveMath({ ...draft, compoundAmount: value, concentration: '' }).autoConcentration
    return { ...draft, compoundAmount: value, concentration: concentration || '' }
}

function onProtocolUnitsChanged(draft: LabelModelInput, value: string): LabelModelInput {
    const patch = protocolUnitsPatch({ value, origin: value ? 'user' : 'recommended' })
    const next: LabelModelInput = { ...draft, ...patch }
    return value ? { ...next, reconstitutionAmount: '' } : next
}

/** Entering Manual Entry: refresh concentration from current water (drop assist leftovers). */
function onModeEntered(draft: LabelModelInput): LabelModelInput {
    const withMode: LabelModelInput = { ...draft, calculatorSolveMode: 'standard' }
    const concentration = deriveMath({ ...withMode, concentration: '' }).autoConcentration
    return { ...withMode, concentration: concentration || '' }
}

function onFieldChanged(draft: LabelModelInput, edit: CalculatorFieldEdit): LabelModelInput {
    switch (edit.kind) {
        case 'compoundAmount': return onCompoundAmountChanged(draft, edit.value)
        case 'water': return onWaterChanged(draft, edit.value)
        case 'protocolAmount': return { ...draft, protocolAmount: edit.value, protocolUnits: '' }
        case 'protocolUnits': return onProtocolUnitsChanged(draft, edit.value)
        case 'mode': return onModeEntered(draft)
        // vialUnit/measureUnit/targetConcentration/vialCapacity: the reducer already
        // applied the mode-independent raw change; Manual Entry has no further reaction.
        case 'vialUnit':
        case 'measureUnit':
        case 'targetConcentration':
        case 'vialCapacity':
            return draft
    }
}

function recommendDefaults(): LabelModelPatch {
    // Manual Entry never recommends a value — every field is user-authored,
    // and deriveMath above already keeps `concentration` fresh on every edit.
    return {}
}

/** Manual Entry's water is the authored field — no compound-amount precondition. */
function requiredWaterMl(input: LabelModelInput): number | null {
    const waterMl = parseNumericField(input.reconstitutionAmount)
    return waterMl > 0 ? waterMl : null
}

export const StandardSolve: SolveStrategy = {
    id: 'standard',
    authoritativeField: 'water',
    waterIsDerived: false,
    drawUnitsAreDerived: false,
    waterFollowsDrawUnitsRecommendation: false,
    requiredWaterMl,
    deriveMath,
    onFieldChanged,
    recommendDefaults,
}
