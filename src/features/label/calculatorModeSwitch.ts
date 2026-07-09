import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import {
    hasPositiveDrawUnits,
    hasPositiveVialAmount,
    resolveDefaultDrawUnitsLabel,
    resolveDefaultTargetConcentration,
} from './peptideMath'
import type { ResolvedLabelMath } from './LabelMathResolver'

export interface CalculatorModeDerivedState {
    autoConcentration?: string;
    autoUnits?: string;
    autoWater?: string;
}

export const CALCULATOR_MODE_OPTIONS = [
    'Manual Entry',
    'Set Concentration',
    'Set Draw Volume',
] as const;

export type CalculatorModeOption = (typeof CALCULATOR_MODE_OPTIONS)[number];

const CALCULATOR_MODE_BY_LABEL = {
    'Manual Entry': 'standard',
    'Set Concentration': 'round_concentration',
    'Set Draw Volume': 'target_units',
} as const satisfies Record<CalculatorModeOption, CalculatorSolveMode>;

const CALCULATOR_LABEL_BY_MODE = Object.fromEntries(
    Object.entries(CALCULATOR_MODE_BY_LABEL).map(([label, mode]) => [mode, label]),
) as Record<CalculatorSolveMode, CalculatorModeOption>;

export function calculatorModeFromLabel(label: string): CalculatorSolveMode {
    return CALCULATOR_MODE_BY_LABEL[label as CalculatorModeOption];
}

export function calculatorModeLabel(mode: CalculatorSolveMode): CalculatorModeOption {
    return CALCULATOR_LABEL_BY_MODE[mode];
}

export function concentrationUnitLabel(vialUnit?: 'mg' | 'IU'): string {
    return vialUnit === 'IU' ? 'IU per ml' : 'mg per ml';
}

/** Pure field updates when the user changes calculator assist mode. */
export function applyCalculatorModeSwitch(
    input: LabelModelInput,
    mode: CalculatorSolveMode,
    derived?: CalculatorModeDerivedState,
): LabelModelInput {
    const next: LabelModelInput = { ...input, calculatorSolveMode: mode };

    if (mode === 'round_concentration' && !input.targetConcentration?.trim()) {
        next.targetConcentration = resolveDefaultTargetConcentration({
            ...input,
            concentration: input.concentration || derived?.autoConcentration,
        });
    }
    if (mode === 'target_units' && !hasPositiveDrawUnits(input.protocolUnits)) {
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            input.protocolAmount, input.measureUnit, input.vialUnit, input.compoundAmount,
        ) || derived?.autoUnits || '';
        if (defaultUnits) next.protocolUnits = defaultUnits;
    }

    return next;
}

export function applyProtocolAmountChange(
    input: LabelModelInput,
    protocolAmount: string,
): Partial<LabelModelInput> {
    const mode = input.calculatorSolveMode || 'standard';
    const next: Partial<LabelModelInput> = { protocolAmount };

    if (mode === 'standard') {
        next.protocolUnits = '';
    } else if (mode === 'round_concentration') {
        next.reconstitutionAmount = '';
        next.protocolUnits = '';
    } else {
        next.reconstitutionAmount = '';
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            protocolAmount, input.measureUnit, input.vialUnit, input.compoundAmount,
        );
        if (defaultUnits) next.protocolUnits = defaultUnits;
    }

    return next;
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
        concentration: input.concentration || resolved.autoConcentration || resolved.mergedInput.concentration || '',
    };
}

export function syncCalculatorModeSwitchFields(
    input: LabelModelInput,
    next: LabelModelInput,
    updateField: <K extends keyof LabelModelInput>(field: K, value: LabelModelInput[K]) => void,
): void {
    updateField('calculatorSolveMode', next.calculatorSolveMode!);
    if (next.targetConcentration !== input.targetConcentration) {
        updateField('targetConcentration', next.targetConcentration);
    }
    if (next.protocolUnits !== input.protocolUnits) {
        updateField('protocolUnits', next.protocolUnits);
    }
}

export function applyFieldUpdates(
    updateField: <K extends keyof LabelModelInput>(field: K, value: LabelModelInput[K]) => void,
    updates: Partial<LabelModelInput>,
): void {
    for (const key of Object.keys(updates) as (keyof LabelModelInput)[]) {
        const value = updates[key];
        if (value !== undefined) updateField(key, value);
    }
}

export function ensureReconstitutionPrintForAssist(
    mode: CalculatorSolveMode,
    resolved: ResolvedLabelMath,
    input: LabelModelInput,
): Partial<LabelModelInput> {
    if (mode !== 'target_units' && mode !== 'round_concentration') return {};
    if (!hasPositiveVialAmount(input.compoundAmount)) return {};
    if (!resolved.autoWater && !resolved.autoConcentration) return {};

    const updates: Partial<LabelModelInput> = { showReconstitution: true };
    if (resolved.autoWater) updates.showWater = true;
    if (resolved.autoConcentration) updates.showConcentration = true;
    return updates;
}
