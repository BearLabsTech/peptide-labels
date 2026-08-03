import {
    calculateReverseWater,
    calculateWaterFromTargetConcentration,
    formatDisplayNumberFixed,
    parseNumericField,
    resolveCalculatorMode,
    resolveMeasureUnit,
} from './peptideMath'
import type { LabelModelInput } from './labelModel'
import { normalizeVialCapacityMl } from './vialCapacity'
import { makeUnitWorld, protocolAmountInVialUnits as protocolAmountToVialUnitsBasis } from './domain/units'

/**
 * The field that is authoritative for the input's current calculator mode —
 * each variant carries only its own field, so a mode cannot be paired with
 * another mode's authoritative value.
 */
export type CalculatorModeInput =
    | { readonly mode: 'standard'; readonly waterMl: number }
    | { readonly mode: 'target_units'; readonly drawUnits: number }
    | { readonly mode: 'round_concentration'; readonly targetConcentration: number }

/** Parses only the field that is authoritative for the input's current mode. */
export function parseCalculatorModeInput(input: LabelModelInput): CalculatorModeInput {
    const mode = resolveCalculatorMode(input)
    if (mode === 'standard') {
        return { mode, waterMl: parseNumericField(input.reconstitutionAmount) }
    }
    if (mode === 'round_concentration') {
        return { mode, targetConcentration: parseNumericField(input.targetConcentration) }
    }
    return { mode, drawUnits: parseNumericField(input.protocolUnits) }
}

/** Convert protocol amount into the vial's unit basis (mg or IU). */
export function protocolAmountInVialUnits(input: LabelModelInput): number | null {
    const protocol = parseFloat(input.protocolAmount || '')
    if (!(protocol > 0)) return null
    const vialUnit = input.vialUnit || 'mg'
    const unitWorld = makeUnitWorld(vialUnit, resolveMeasureUnit(vialUnit, input.measureUnit))
    if (!unitWorld) return null // unrepresentable: UnitWorld pairs vialUnit with measureUnit
    return protocolAmountToVialUnitsBasis(protocol, unitWorld)
}

/**
 * True when protocol amount exceeds compound amount (same substance basis).
 * Does not consider water volume vs physical vial capacity.
 */
export function isProtocolExceedsCompound(input: LabelModelInput): boolean {
    const compound = parseFloat(input.compoundAmount || '')
    if (!(compound > 0)) return false
    const protocolInVialUnits = protocolAmountInVialUnits(input)
    if (protocolInVialUnits == null) return false
    return protocolInVialUnits > compound
}

/**
 * Raw measures-per-vial for math/tests. Do not round here.
 * Display must use {@link formatMeasuresPerVialDisplay}.
 */
export function computeMeasuresPerVialRaw(input: LabelModelInput): number | null {
    const compound = parseFloat(input.compoundAmount || '')
    if (!(compound > 0)) return null
    const protocolInVialUnits = protocolAmountInVialUnits(input)
    if (protocolInVialUnits == null || !(protocolInVialUnits > 0)) return null
    return compound / protocolInVialUnits
}

/**
 * Display-only rounding to 3 decimal places.
 * Never pass the result of this function into subsequent math.
 */
export function formatMeasuresPerVialDisplay(raw: number): string {
    return formatDisplayNumberFixed(raw)
}

/** Exact water implied by the current calculator inputs, before display rounding. */
export function calculateRequiredWaterMl(input: LabelModelInput): number | null {
    const modeInput = parseCalculatorModeInput(input)
    if (modeInput.mode === 'standard') {
        return modeInput.waterMl > 0 ? modeInput.waterMl : null
    }

    const compoundAmount = parseFloat(input.compoundAmount || '')
    if (!(compoundAmount > 0)) return null

    if (modeInput.mode === 'round_concentration') {
        return calculateWaterFromTargetConcentration(compoundAmount, modeInput.targetConcentration)
    }

    const vialUnit = input.vialUnit || 'mg'
    const unitWorld = makeUnitWorld(vialUnit, resolveMeasureUnit(vialUnit, input.measureUnit))
    if (!unitWorld) return null // unrepresentable: UnitWorld pairs vialUnit with measureUnit
    return calculateReverseWater({
        compoundAmount: compoundAmount,
        unitWorld,
        drawUnits: modeInput.drawUnits,
        protocolAmount: parseFloat(input.protocolAmount || ''),
    })
}

export function isWaterAboveVialCapacity(
    input: LabelModelInput,
    vialCapacityMl: number,
): boolean {
    const waterMl = calculateRequiredWaterMl(input)
    return waterMl != null && waterMl > normalizeVialCapacityMl(vialCapacityMl) + 1e-9
}
