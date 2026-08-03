import type { Result } from '../../../shared/result'

/** Insulin syringe units per milliliter. */
export const UNITS_PER_ML = 100
/** Micrograms per milligram. */
export const MCG_PER_MG = 1000

export type MassUnit = 'mg' | 'mcg' | 'IU'

export type Mass = {
  readonly value: number
  readonly unit: MassUnit
  readonly __brand: 'Mass'
}

export type VolumeMl = {
  readonly value: number
  readonly __brand: 'VolumeMl'
}

export type ConcentrationPerMl = {
  readonly value: number
  readonly unit: 'mg' | 'IU'
  readonly __brand: 'ConcentrationPerMl'
}

export type DrawUnits = {
  readonly value: number
  readonly __brand: 'DrawUnits'
}

export type VialCapacityMl = {
  readonly value: number
  readonly __brand: 'VialCapacityMl'
}

export type SyringeCapacityMl = {
  readonly value: number
  readonly __brand: 'SyringeCapacityMl'
}

const MASS_UNITS: readonly MassUnit[] = ['mg', 'mcg', 'IU']

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function makeMass(value: number, unit: string): Result<Mass, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Mass must be a finite non-negative number' }
  }
  if (!(MASS_UNITS as readonly string[]).includes(unit)) {
    return { ok: false, error: `Unrecognized mass unit: ${unit}` }
  }
  return {
    ok: true,
    value: { value, unit: unit as MassUnit, __brand: 'Mass' },
  }
}

export function makeVolumeMl(value: number): Result<VolumeMl, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Volume must be a finite non-negative number' }
  }
  return { ok: true, value: { value, __brand: 'VolumeMl' } }
}

export function makeConcentrationPerMl(
  value: number,
  unit: 'mg' | 'IU',
): Result<ConcentrationPerMl, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Concentration must be a finite non-negative number' }
  }
  return { ok: true, value: { value, unit, __brand: 'ConcentrationPerMl' } }
}

export function makeDrawUnits(value: number): Result<DrawUnits, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Draw units must be a finite non-negative number' }
  }
  return { ok: true, value: { value, __brand: 'DrawUnits' } }
}

export function makeVialCapacityMl(value: number): Result<VialCapacityMl, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Vial capacity must be a finite non-negative number' }
  }
  return { ok: true, value: { value, __brand: 'VialCapacityMl' } }
}

export function makeSyringeCapacityMl(value: number): Result<SyringeCapacityMl, string> {
  if (!isFiniteNonNegative(value)) {
    return { ok: false, error: 'Syringe capacity must be a finite non-negative number' }
  }
  return { ok: true, value: { value, __brand: 'SyringeCapacityMl' } }
}

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

/** Convert draw volume in ml to insulin syringe units. */
export function mlToDrawUnits(volumeMl: number): number {
  return volumeMl * UNITS_PER_ML
}

/** Convert insulin syringe units to volume in ml. */
export function drawUnitsToMl(drawUnits: number): number {
  return drawUnits / UNITS_PER_ML
}

/** Convert mcg ↔ mg using the shared conversion factor. */
export function mcgToMg(mcg: number): number {
  return mcg / MCG_PER_MG
}

export function mgToMcg(mg: number): number {
  return mg * MCG_PER_MG
}

const VIAL_UNITS = ['mg', 'IU'] as const
const MEASURE_UNITS = ['mg', 'mcg', 'IU'] as const

export type VialUnit = (typeof VIAL_UNITS)[number]
export type MeasureUnit = (typeof MEASURE_UNITS)[number]

export function parseVialUnit(value: string): VialUnit | undefined {
  return (VIAL_UNITS as readonly string[]).includes(value)
    ? (value as VialUnit)
    : undefined
}

export function parseMeasureUnit(value: string): MeasureUnit | undefined {
  return (MEASURE_UNITS as readonly string[]).includes(value)
    ? (value as MeasureUnit)
    : undefined
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
