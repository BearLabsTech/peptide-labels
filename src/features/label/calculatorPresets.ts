import { parseNumericField } from './peptideMath'
import { syringeMaxUnits, type SyringeCapacityMl } from './syringe/syringeCapacity'
import type { LabelModelInput } from './labelModel'
import { DRAW_UNIT_QUICK_PICKS } from './drawUnitsPolicy'

export const VIAL_AMOUNT_PRESETS_MG = ['5', '10', '15', '20', '30', '50', '100'] as const
export const VIAL_AMOUNT_PRESETS_IU = ['1000', '2000', '5000', '10000'] as const
export const PROTOCOL_AMOUNT_PRESETS_MG = ['1', '2', '3', '4', '5', '6', '10'] as const
export const PROTOCOL_AMOUNT_PRESETS_MCG = ['100', '250', '500', '750', '1000'] as const
export const PROTOCOL_AMOUNT_PRESETS_IU = ['10', '25', '50', '100', '200'] as const
export const WATER_PRESETS_ML = ['0.5', '1', '1.5', '2', '2.5', '3'] as const
export const DRAW_UNITS_PRESETS = Object.freeze(DRAW_UNIT_QUICK_PICKS.map(String))

export function vialAmountPresets(vialUnit: 'mg' | 'IU' | undefined): readonly string[] {
    return vialUnit === 'IU' ? VIAL_AMOUNT_PRESETS_IU : VIAL_AMOUNT_PRESETS_MG
}

export function protocolAmountPresets(
    measureUnit: LabelModelInput['measureUnit'],
    vialUnit: LabelModelInput['vialUnit'],
): readonly string[] {
    if (vialUnit === 'IU' || measureUnit === 'IU') return PROTOCOL_AMOUNT_PRESETS_IU
    if (measureUnit === 'mg') return PROTOCOL_AMOUNT_PRESETS_MG
    return PROTOCOL_AMOUNT_PRESETS_MCG
}

/** Predictable 5-unit steps through 50, then 10-unit steps, capped to syringe max. */
export function drawUnitsPresets(capacityMl: SyringeCapacityMl): string[] {
    const max = syringeMaxUnits(capacityMl)
    return DRAW_UNITS_PRESETS.filter((units) => Number(units) <= max)
}

export function isPresetSelected(current: string | undefined, preset: string): boolean {
    return parseNumericField(current) === parseFloat(preset)
}
