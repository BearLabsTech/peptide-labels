import type { LabelModelInput, LabelModelPatch } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { DEFAULT_CALCULATOR_SOLVE_MODE, hasPositiveCompoundAmount } from './peptideMath'
import type { ResolvedLabelMath } from './domain/labelMathCore'

export { DEFAULT_CALCULATOR_SOLVE_MODE } from './peptideMath'

/**
 * Pairs a value with which kind of fact it is — recommended (system-generated,
 * safe to regenerate) or user (authored, must not be silently overwritten).
 * A provenance flag cannot exist without the value it describes.
 */
export interface Provenance<T> {
    readonly value: T
    readonly origin: 'recommended' | 'user'
}

export function protocolUnitsPatch(p: Provenance<string>): Pick<LabelModelPatch, 'protocolUnits' | 'protocolUnitsOrigin'> {
    return { protocolUnits: p.value, protocolUnitsOrigin: p.origin }
}

export function targetConcentrationPatch(p: Provenance<string>): Pick<LabelModelPatch, 'targetConcentration' | 'targetConcentrationOrigin'> {
    return { targetConcentration: p.value, targetConcentrationOrigin: p.origin }
}

export const CALCULATOR_MODE_OPTIONS = [
    'Set Draw Volume',
    'Set Concentration',
    'Manual Entry',
] as const;

export type CalculatorModeOption = (typeof CALCULATOR_MODE_OPTIONS)[number];

const CALCULATOR_MODE_BY_LABEL = {
    'Manual Entry': 'standard',
    'Set Concentration': 'round_concentration',
    'Set Draw Volume': 'target_units',
} as const satisfies Record<CalculatorModeOption, CalculatorSolveMode>;

export const CALCULATOR_LABEL_BY_MODE = Object.freeze(
    Object.fromEntries(
        Object.entries(CALCULATOR_MODE_BY_LABEL).map(([label, mode]) => [mode, label]),
    ) as Record<CalculatorSolveMode, CalculatorModeOption>,
)

export function parseCalculatorModeOption(label: string): CalculatorModeOption | undefined {
    return (CALCULATOR_MODE_OPTIONS as readonly string[]).includes(label)
        ? (label as CalculatorModeOption)
        : undefined
}

export function calculatorModeFromLabel(label: string): CalculatorSolveMode {
    const option = parseCalculatorModeOption(label)
    return option ? CALCULATOR_MODE_BY_LABEL[option] : DEFAULT_CALCULATOR_SOLVE_MODE
}

export function calculatorModeLabel(mode: CalculatorSolveMode): CalculatorModeOption {
    return CALCULATOR_LABEL_BY_MODE[mode];
}

export function concentrationUnitLabel(vialUnit?: 'mg' | 'IU'): string {
    return vialUnit === 'IU' ? 'IU per ml' : 'mg per ml';
}

export interface ResolvedCalculatorValues {
    water: string;
    units: string;
    concentration: string;
}

export function readResolvedCalculatorValues(
    input: LabelModelInput,
    resolved: ResolvedLabelMath,
): ResolvedCalculatorValues {
    return {
        water: input.reconstitutionAmount || resolved.autoWater,
        units: input.protocolUnits || resolved.autoUnits,
        concentration: resolved.autoConcentration || input.concentration || '',
    };
}

export function ensureReconstitutionPrintForAssist(
    resolved: ResolvedLabelMath,
    input: LabelModelInput,
): LabelModelPatch {
    if (!hasPositiveCompoundAmount(input.compoundAmount)) return {};
    if (!resolved.autoWater && !resolved.autoConcentration) return {};

    const updates: LabelModelPatch = { showReconstitution: true };
    if (resolved.autoWater) updates.showWater = true;
    if (resolved.autoConcentration) updates.showConcentration = true;
    return updates;
}
