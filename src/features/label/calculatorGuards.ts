import {
    calculateReverseWater,
    calculateWaterFromTargetConcentration,
    formatDisplayNumberFixed,
    MCG_PER_MG,
    parseNumericField,
    resolveMeasureUnit,
} from './peptideMath'
import type { LabelModelInput } from './labelModel'
import { normalizeVialCapacityMl } from './vialCapacity'

/** Convert protocol amount into the vial's unit basis (mg or IU). */
export function protocolAmountInVialUnits(input: LabelModelInput): number | null {
    const protocol = parseFloat(input.protocolAmount || '')
    if (!(protocol > 0)) return null
    const vialUnit = input.vialUnit || 'mg'
    const measureUnit = resolveMeasureUnit(vialUnit, input.measureUnit)
    if (vialUnit === 'IU') {
        return measureUnit === 'IU' ? protocol : null
    }
    if (measureUnit === 'IU') return null
    return measureUnit === 'mg' ? protocol : protocol / MCG_PER_MG
}

/**
 * True when protocol amount exceeds vial amount (same substance basis).
 * Does not consider water volume vs physical vial size.
 */
export function isProtocolExceedsVial(input: LabelModelInput): boolean {
    const vial = parseFloat(input.compoundAmount || '')
    if (!(vial > 0)) return false
    const protocolInVialUnits = protocolAmountInVialUnits(input)
    if (protocolInVialUnits == null) return false
    return protocolInVialUnits > vial
}

/**
 * Raw measures-per-vial for math/tests. Do not round here.
 * Display must use {@link formatMeasuresPerVialDisplay}.
 */
export function computeMeasuresPerVialRaw(input: LabelModelInput): number | null {
    const vial = parseFloat(input.compoundAmount || '')
    if (!(vial > 0)) return null
    const protocolInVialUnits = protocolAmountInVialUnits(input)
    if (protocolInVialUnits == null || !(protocolInVialUnits > 0)) return null
    return vial / protocolInVialUnits
}

/**
 * Display-only rounding to 3 decimal places.
 * Never pass the result of this function into subsequent math.
 */
export function formatMeasuresPerVialDisplay(raw: number): string {
    return formatDisplayNumberFixed(raw)
}

export function parseDrawUnitsValue(label?: string): number {
    return parseNumericField(label)
}

/** Exact water implied by the current calculator inputs, before display rounding. */
export function calculateRequiredWaterMl(input: LabelModelInput): number | null {
    const mode = input.calculatorSolveMode || 'target_units'
    if (mode === 'standard') {
        const water = parseNumericField(input.reconstitutionAmount)
        return water > 0 ? water : null
    }

    const compoundAmount = parseFloat(input.compoundAmount || '')
    if (!(compoundAmount > 0)) return null

    if (mode === 'round_concentration') {
        return calculateWaterFromTargetConcentration(
            compoundAmount,
            parseNumericField(input.targetConcentration),
        )
    }

    return calculateReverseWater({
        vialAmount: compoundAmount,
        vialUnit: input.vialUnit || 'mg',
        drawUnits: parseDrawUnitsValue(input.protocolUnits),
        targetAmount: parseFloat(input.protocolAmount || ''),
        targetUnit: resolveMeasureUnit(input.vialUnit || 'mg', input.measureUnit),
    })
}

export function isWaterAboveVialCapacity(
    input: LabelModelInput,
    vialCapacityMl: number,
): boolean {
    const waterMl = calculateRequiredWaterMl(input)
    return waterMl != null && waterMl > normalizeVialCapacityMl(vialCapacityMl) + 1e-9
}
