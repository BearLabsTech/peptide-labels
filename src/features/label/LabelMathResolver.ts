import type { LabelModelInput } from './labelModel'
import { SOLVE_STRATEGIES } from './domain/solveStrategy'
import { resolveCalculatorMode } from './peptideMath'

export type { ResolvedLabelMath } from './domain/labelMathCore'
import type { ResolvedLabelMath } from './domain/labelMathCore'

/**
 * User-entered (and form-synced) calculator/label fields.
 * Derived math never writes back into this object.
 */
export type AuthoredInputs = LabelModelInput

/**
 * Authored inputs paired with one fresh derived math result.
 * Downstream code reads each half separately; there is no merged write-back model.
 */
export interface CalculatorState {
    readonly authored: AuthoredInputs;
    readonly derived: ResolvedLabelMath;
}

export function resolveCalculatorState(authored: AuthoredInputs): CalculatorState {
    return { authored, derived: resolveLabelMath(authored) };
}

/**
 * One registry lookup, then the mode's own {@link SolveStrategy.deriveMath}
 * — no mode branching lives here anymore (see `domain/solveStrategy.ts`).
 */
export function resolveLabelMath(input: LabelModelInput): ResolvedLabelMath {
    return SOLVE_STRATEGIES[resolveCalculatorMode(input)].deriveMath(input);
}
