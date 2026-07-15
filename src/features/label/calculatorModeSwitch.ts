import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import {
    hasPositiveDrawUnits,
    hasPositiveVialAmount,
    resolveDefaultDrawUnitsLabel,
    resolveDefaultTargetConcentration,
} from './peptideMath'
import { resolveLabelMath, type ResolvedLabelMath } from './LabelMathResolver'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'

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

/** Fresh-session default assist mode (calculator and label designer). */
export const DEFAULT_CALCULATOR_SOLVE_MODE: CalculatorSolveMode = 'target_units';

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
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): LabelModelInput & Required<Pick<LabelModelInput, 'calculatorSolveMode'>> {
    const next: LabelModelInput & Required<Pick<LabelModelInput, 'calculatorSolveMode'>> = {
        ...input,
        calculatorSolveMode: mode,
    };

    const canRecommendTarget = hasPositiveVialAmount(input.compoundAmount)
        || Boolean(input.concentration?.trim());
    if (
        mode === 'round_concentration'
        && !input.targetConcentration?.trim()
        && canRecommendTarget
    ) {
        const generatedDrawSource = input.calculatorSolveMode === 'target_units'
            && input.protocolUnitsOrigin === 'recommended';
        const recommendationInput = generatedDrawSource
            ? { compoundAmount: input.compoundAmount }
            : {
                ...input,
                concentration: input.concentration || derived?.autoConcentration,
            };
        next.targetConcentration = resolveDefaultTargetConcentration(
            recommendationInput,
            vialCapacityMl,
        );
        next.targetConcentrationOrigin = 'recommended';
    }
    if (mode === 'target_units' && !hasPositiveDrawUnits(input.protocolUnits)) {
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            input.protocolAmount, input.measureUnit, input.vialUnit, input.compoundAmount,
            vialCapacityMl,
        ) || derived?.autoUnits || '';
        if (defaultUnits) {
            next.protocolUnits = defaultUnits;
            next.protocolUnitsOrigin = 'recommended';
        }
    }

    return next;
}

export function applyProtocolAmountChange(
    input: LabelModelInput,
    protocolAmount: string,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): Partial<LabelModelInput> {
    const mode = input.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE;
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
            vialCapacityMl,
        );
        if (defaultUnits) {
            next.protocolUnits = defaultUnits;
            next.protocolUnitsOrigin = 'recommended';
        }
    }

    return next;
}

/** Recalculate only system-generated defaults when physical vial capacity changes. */
export function applyVialCapacityRecommendationChange(
    input: LabelModelInput,
    vialCapacityMl: number,
): Partial<LabelModelInput> {
    const mode = input.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE;
    if (mode === 'target_units') {
        const canRegenerate = !hasPositiveDrawUnits(input.protocolUnits)
            || input.protocolUnitsOrigin === 'recommended';
        if (!canRegenerate) return {};
        const protocolUnits = resolveDefaultDrawUnitsLabel(
            input.protocolAmount,
            input.measureUnit,
            input.vialUnit,
            input.compoundAmount,
            vialCapacityMl,
        );
        return protocolUnits ? { protocolUnits, protocolUnitsOrigin: 'recommended' } : {};
    }

    if (mode === 'round_concentration') {
        const canRegenerate = !input.targetConcentration?.trim()
            || input.targetConcentrationOrigin === 'recommended';
        if (!canRegenerate) return {};
        return {
            targetConcentration: resolveDefaultTargetConcentration({
                compoundAmount: input.compoundAmount,
            }, vialCapacityMl),
            targetConcentrationOrigin: 'recommended',
        };
    }

    return {};
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
        concentration: resolved.autoConcentration || input.concentration || resolved.mergedInput.concentration || '',
    };
}

/**
 * Manual Entry water edit: clear draw units (forward math will refill) and
 * replace concentration from vial ÷ water — never keep a prior assist label.
 */
export function applyStandardWaterChange(
    input: LabelModelInput,
    waterMl: string,
): Partial<LabelModelInput> {
    const protocolUnits = waterMl ? '' : (input.protocolUnits || '');
    const draft: LabelModelInput = {
        ...input,
        calculatorSolveMode: 'standard',
        reconstitutionAmount: waterMl,
        protocolUnits,
        concentration: '',
    };
    const resolved = resolveLabelMath(draft);
    return {
        reconstitutionAmount: waterMl,
        protocolUnits,
        concentration: resolved.autoConcentration || '',
    };
}

/** Manual Entry vial edit: refresh concentration from vial ÷ current water. */
export function applyStandardVialAmountChange(
    input: LabelModelInput,
    compoundAmount: string,
): Partial<LabelModelInput> {
    const draft: LabelModelInput = {
        ...input,
        calculatorSolveMode: 'standard',
        compoundAmount,
        concentration: '',
    };
    const resolved = resolveLabelMath(draft);
    return {
        compoundAmount,
        concentration: resolved.autoConcentration || '',
    };
}

/** When entering Manual Entry, refresh concentration from current water (drop assist leftovers). */
export function applyStandardModeEntry(input: LabelModelInput): Partial<LabelModelInput> {
    const draft: LabelModelInput = {
        ...input,
        calculatorSolveMode: 'standard',
        concentration: '',
    };
    const resolved = resolveLabelMath(draft);
    return {
        calculatorSolveMode: 'standard',
        concentration: resolved.autoConcentration || '',
    };
}

export function syncCalculatorModeSwitchFields(
    input: LabelModelInput,
    next: LabelModelInput & Required<Pick<LabelModelInput, 'calculatorSolveMode'>>,
    updateField: LabelFieldUpdater,
): void {
    updateField('calculatorSolveMode', next.calculatorSolveMode);
    if (next.targetConcentration !== input.targetConcentration) {
        updateField('targetConcentration', next.targetConcentration);
    }
    if (next.targetConcentrationOrigin !== input.targetConcentrationOrigin) {
        updateField('targetConcentrationOrigin', next.targetConcentrationOrigin);
    }
    if (next.protocolUnits !== input.protocolUnits) {
        updateField('protocolUnits', next.protocolUnits);
    }
    if (next.protocolUnitsOrigin !== input.protocolUnitsOrigin) {
        updateField('protocolUnitsOrigin', next.protocolUnitsOrigin);
    }
}

export function applyFieldUpdates(
    updateField: LabelFieldUpdater,
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
