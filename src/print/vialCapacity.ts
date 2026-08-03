export type VialCapacityMl = number

export const DEFAULT_VIAL_CAPACITY_ML = 3
export const MIN_VIAL_CAPACITY_ML = 1
export const VIAL_CAPACITY_PRESETS_ML = [3, 5, 10, 20, 30] as const

export function normalizeVialCapacityMl(value?: number): VialCapacityMl {
  return Number.isFinite(value) && value! >= MIN_VIAL_CAPACITY_ML
    ? value!
    : DEFAULT_VIAL_CAPACITY_ML
}
