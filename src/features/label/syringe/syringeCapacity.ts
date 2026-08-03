export const SYRINGE_CAPACITY_OPTIONS_ML = [1.0, 0.5, 0.3] as const

export type SyringeCapacityMl = (typeof SYRINGE_CAPACITY_OPTIONS_ML)[number]

/** Default syringe — rarely changed by users. */
export const DEFAULT_SYRINGE_CAPACITY_ML: SyringeCapacityMl = 1.0

/** Set false to hide syringe assist on the label designer (calculator keeps it). */
export const SHOW_SYRINGE_ON_DESIGNER = true

const MAX_UNITS_BY_ML: Record<SyringeCapacityMl, number> = {
    1.0: 100,
    0.5: 50,
    0.3: 30,
}

export function syringeMaxUnits(syringeCapacityMl: SyringeCapacityMl): number {
    return MAX_UNITS_BY_ML[syringeCapacityMl]
}

export function parseSyringeCapacityMl(value: unknown): SyringeCapacityMl {
    if (value === 0.3 || value === 0.5 || value === 1 || value === 1.0) {
        return value === 1 ? 1.0 : value
    }
    return DEFAULT_SYRINGE_CAPACITY_ML
}

export function isDrawOverSyringeCapacity(drawUnits: number, syringeCapacityMl: SyringeCapacityMl): boolean {
    return drawUnits > syringeMaxUnits(syringeCapacityMl)
}
