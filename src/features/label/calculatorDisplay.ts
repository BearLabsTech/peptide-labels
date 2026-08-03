import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { hasPositiveCompoundAmount } from './peptideMath'
import { SOLVE_STRATEGIES } from './domain/solveStrategy'

export interface CalculatorModeDerivedState {
    autoConcentration?: string
    autoUnits?: string
    autoWater?: string
}

export function displayWaterAmount(
    mode: CalculatorSolveMode,
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    const { waterIsDerived } = SOLVE_STRATEGIES[mode]
    if (waterIsDerived && !hasPositiveCompoundAmount(input.compoundAmount)) return ''
    if (waterIsDerived) return derived?.autoWater || input.reconstitutionAmount || ''
    return input.reconstitutionAmount || derived?.autoWater || ''
}

export function displayDrawUnits(
    mode: CalculatorSolveMode,
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    if (SOLVE_STRATEGIES[mode].drawUnitsAreDerived) return derived?.autoUnits || input.protocolUnits || ''
    return input.protocolUnits || derived?.autoUnits || ''
}

export function displayConcentration(
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    return derived?.autoConcentration || input.concentration || ''
}
