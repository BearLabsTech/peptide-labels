/** Insulin syringe units per milliliter. */
export const UNITS_PER_ML = 100
/** Micrograms per milligram. */
export const MCG_PER_MG = 1000

/**
 * Convert a protocol amount into the vial's unit basis (mg or IU).
 * Takes an already-parsed number and an already-validated `UnitWorld`, so
 * there is no mismatched-pairing case left to guard against here.
 */
export function protocolAmountInVialUnits(
  protocolAmount: number,
  unitWorld: UnitWorld,
): number {
  if (unitWorld.vialUnit === 'IU') return protocolAmount
  return unitWorld.measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG
}

const VIAL_UNITS = ['mg', 'IU'] as const
const MEASURE_UNITS = ['mg', 'mcg', 'IU'] as const

export type VialUnit = (typeof VIAL_UNITS)[number]
export type MeasureUnit = (typeof MEASURE_UNITS)[number]

export function parseVialUnit(value: string): VialUnit | null {
  return (VIAL_UNITS as readonly string[]).includes(value)
    ? (value as VialUnit)
    : null
}

export function parseMeasureUnit(value: string): MeasureUnit | null {
  return (MEASURE_UNITS as readonly string[]).includes(value)
    ? (value as MeasureUnit)
    : null
}

/**
 * A vial unit paired with a measure unit valid for it — an IU vial can only
 * pair with an IU measure, and an mg vial can only pair with mg or mcg.
 * Once a caller holds a `UnitWorld`, the pairing cannot disagree; there is
 * nothing left to compare.
 */
export type UnitWorld =
  | { readonly vialUnit: 'mg'; readonly measureUnit: 'mg' | 'mcg' }
  | { readonly vialUnit: 'IU'; readonly measureUnit: 'IU' }

/**
 * The only place vial/measure unit compatibility is checked. Returns null
 * for an inconsistent pairing (e.g. an mg vial explicitly paired with an IU
 * measure) — callers treat that the same way they treat any other invalid
 * calculator input, typically by falling back to a default/empty state.
 */
export function makeUnitWorld(vialUnit: VialUnit, measureUnit: MeasureUnit): UnitWorld | null {
  if (vialUnit === 'IU') return measureUnit === 'IU' ? { vialUnit, measureUnit } : null
  return measureUnit === 'IU' ? null : { vialUnit, measureUnit }
}
