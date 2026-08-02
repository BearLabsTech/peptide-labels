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
 * Takes already-parsed numbers; callers that hold strings should parse first.
 */
export function protocolAmountInVialUnits(
  protocolAmount: number,
  measureUnit: MassUnit,
  vialUnit: 'mg' | 'IU',
): number | null {
  if (vialUnit === 'IU') return measureUnit === 'IU' ? protocolAmount : null
  if (measureUnit === 'IU') return null
  return measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG
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
