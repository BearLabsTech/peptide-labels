import type { LabelModelInput, LabelModelPatch } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { DEFAULT_CALCULATOR_SOLVE_MODE, hasPositiveVialAmount } from './peptideMath'
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

export interface CalculatorModeDerivedState {
    autoConcentration?: string;
    autoUnits?: string;
    autoWater?: string;
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

export function displayWaterAmount(
    mode: CalculatorSolveMode,
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    if (mode !== 'standard' && !hasPositiveVialAmount(input.compoundAmount)) return '';
    if (mode !== 'standard') return derived?.autoWater || input.reconstitutionAmount || '';
    return input.reconstitutionAmount || derived?.autoWater || '';
}

export function displayDrawUnits(
    mode: CalculatorSolveMode,
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    if (mode === 'round_concentration') return derived?.autoUnits || input.protocolUnits || '';
    return input.protocolUnits || derived?.autoUnits || '';
}

/**
 * Concentration display. Prefer freshly derived values so a leftover assist result
 * cannot stick after Manual Entry water/vial changes.
 */
export function displayConcentration(
    input: LabelModelInput,
    derived?: CalculatorModeDerivedState,
): string {
    return derived?.autoConcentration || input.concentration || '';
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
    mode: CalculatorSolveMode,
    resolved: ResolvedLabelMath,
    input: LabelModelInput,
): LabelModelPatch {
    if (mode !== 'target_units' && mode !== 'round_concentration') return {};
    if (!hasPositiveVialAmount(input.compoundAmount)) return {};
    if (!resolved.autoWater && !resolved.autoConcentration) return {};

    const updates: LabelModelPatch = { showReconstitution: true };
    if (resolved.autoWater) updates.showWater = true;
    if (resolved.autoConcentration) updates.showConcentration = true;
    return updates;
}
