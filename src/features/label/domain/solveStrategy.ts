import type { LabelModelInput, LabelModelPatch } from '../labelModel'
import type { CalculatorSolveMode } from '../peptideMath'
import type { ResolvedLabelMath } from './labelMathCore'
import { StandardSolve } from './standardSolve'
import { TargetUnitsSolve } from './targetUnitsSolve'
import { RoundConcentrationSolve } from './roundConcentrationSolve'

/** Every calculator input a {@link SolveStrategy} can react to. */
export type CalculatorFieldKind =
    | 'vialUnit'
    | 'compoundAmount'
    | 'water'
    | 'protocolAmount'
    | 'measureUnit'
    | 'drawVolume'
    | 'mode'
    | 'targetConcentration'
    | 'vialCapacity'

/**
 * One edit per calculator input the user can change, carrying exactly the
 * raw data the reducer received for it. `vialUnit`/`measureUnit`/`mode`/
 * `targetConcentration`/`vialCapacity` carry no extra payload because the
 * reducer already folds their mode-independent raw value into `draft`
 * before calling {@link SolveStrategy.onFieldChanged} — only the fields
 * whose raw-value reaction is itself mode-dependent (a mode can veto the
 * edit outright, e.g. Set Concentration ignores direct water edits) carry
 * their value here.
 */
export type CalculatorFieldEdit =
    | { readonly kind: 'vialUnit' }
    | { readonly kind: 'compoundAmount'; readonly value: string }
    | { readonly kind: 'water'; readonly value: string }
    | { readonly kind: 'protocolAmount'; readonly value: string }
    | { readonly kind: 'measureUnit' }
    | { readonly kind: 'drawVolume'; readonly value: string }
    /**
     * `oldDerived` is the outgoing mode's math, computed once by the reducer
     * before dispatch. Set Concentration's entry recommendation can fall
     * back to it (see `roundConcentrationSolve.ts`); passing it down here
     * keeps every strategy a leaf module with no dependency on the registry
     * that assembles them, so there is no import cycle back through
     * `LabelMathResolver.ts`.
     */
    | { readonly kind: 'mode'; readonly oldDerived: ResolvedLabelMath }
    | { readonly kind: 'targetConcentration' }
    | { readonly kind: 'vialCapacity' }

/**
 * One calculator solve mode's complete behavior, so the reducer can select
 * a strategy once per event and never branch on mode again. Every method is
 * total for every mode — a mode where a method has nothing to do returns an
 * empty patch or the draft unchanged, never a "not supported" throw (Liskov;
 * see `docs/CODE-QUALITY.md` section A).
 */
export interface SolveStrategy {
    readonly id: CalculatorSolveMode

    /** Forward/reverse math for this mode, falling back to the shared generic math. */
    deriveMath(draft: LabelModelInput): ResolvedLabelMath

    /**
     * Immediate, capacity-independent reaction to one field's raw edit —
     * setting the field itself (for mode-dependent fields) and any directly
     * dependent field it clears or recomputes. Never recommends a fresh
     * default value (that is {@link recommendDefaults}'s job).
     */
    onFieldChanged(draft: LabelModelInput, edit: CalculatorFieldEdit, vialCapacityMl: number): LabelModelInput

    /**
     * Capacity-dependent recommended defaults for this mode (a fresh target
     * concentration, draw units, or recomputed water/concentration), given
     * which field just changed. Called after {@link onFieldChanged} for
     * every event; a mode with nothing to recommend returns `{}`.
     */
    recommendDefaults(draft: LabelModelInput, vialCapacityMl: number, field: CalculatorFieldKind): LabelModelPatch
}

/**
 * Registry keyed by mode. The reducer looks up exactly one strategy per
 * event; no other module branches on `calculatorSolveMode` again. Frozen so
 * a caller cannot rebind a mode to a different strategy at runtime.
 */
export const SOLVE_STRATEGIES: Record<CalculatorSolveMode, SolveStrategy> = Object.freeze({
    standard: StandardSolve,
    target_units: TargetUnitsSolve,
    round_concentration: RoundConcentrationSolve,
})
