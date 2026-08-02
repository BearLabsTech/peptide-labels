import type { LabelModelInput } from './labelModel'
import {
    DEFAULT_CALCULATOR_SOLVE_MODE,
    calculateDrawVolume,
    calculateReverseWater,
    calculateFromTargetConcentration,
    calculateWaterFromTargetConcentration,
    formatConcentrationLabel,
    formatDrawUnitsLabel,
    formatDefaultDrawUnitsLabel,
    formatWaterAmountLabel,
    parseNumericField,
    resolveMeasureUnit,
    type CalculatorSolveMode,
} from './peptideMath'

export interface ResolvedLabelMath {
    readonly mergedInput: LabelModelInput;
    readonly autoUnits: string;
    readonly autoWater: string;
    readonly autoConcentration: string;
}

interface ParsedLabelMathInput {
    vialAmount: number;
    waterMl: number;
    protocolAmount: number;
    drawUnits: number;
    targetConcentration: number;
    vialUnit: 'mg' | 'IU';
    protocolUnit: 'mg' | 'mcg' | 'IU';
    mode: CalculatorSolveMode;
}

export function resolveLabelMath(input: LabelModelInput): ResolvedLabelMath {
    const parsed = parseLabelMathInput(input);

    if (parsed.mode === 'round_concentration' && hasVialAmount(parsed) && parsed.targetConcentration > 0) {
        if (hasProtocolAmount(parsed)) return calcFromConcentration(input, parsed);
        return calcWaterFromTargetConcentration(input, parsed);
    }
    if (parsed.mode === 'target_units' && hasVialAndProtocol(parsed) && parsed.drawUnits > 0) {
        return calcReverse(input, parsed);
    }
    if (parsed.waterMl > 0 && hasVialAndProtocol(parsed)) {
        return calcForward(input, parsed);
    }
    if (hasVialAndProtocol(parsed) && parsed.drawUnits > 0) {
        return calcReverse(input, parsed);
    }

    const autoConcentration = concentrationFromVialWater(parsed);
    return buildResult(input, {
        autoUnits: '',
        autoWater: '',
        autoConcentration,
        // Manual Entry: vial ÷ water is authoritative — never keep a stale stored concentration.
        mergedPatch: autoConcentration ? { concentration: autoConcentration } : {},
    });
}

function parseLabelMathInput(input: LabelModelInput): ParsedLabelMathInput {
    const vialUnit = (input.vialUnit || 'mg') as 'mg' | 'IU';
    return {
        vialAmount: parseFloat(input.compoundAmount || '0'),
        waterMl: parseFloat(input.reconstitutionAmount || '0'),
        protocolAmount: parseFloat(input.protocolAmount || '0'),
        drawUnits: parseNumericField(input.protocolUnits),
        targetConcentration: parseFloat(input.targetConcentration || '0'),
        vialUnit,
        protocolUnit: resolveMeasureUnit(vialUnit, input.measureUnit),
        mode: input.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE,
    };
}

function hasVialAmount(parsed: ParsedLabelMathInput): boolean {
    return Number.isFinite(parsed.vialAmount) && parsed.vialAmount > 0;
}

function hasProtocolAmount(parsed: ParsedLabelMathInput): boolean {
    return Number.isFinite(parsed.protocolAmount) && parsed.protocolAmount > 0;
}

function hasVialAndProtocol(parsed: ParsedLabelMathInput): boolean {
    return hasVialAmount(parsed) && hasProtocolAmount(parsed);
}

function concentrationFromVialWater(parsed: ParsedLabelMathInput): string {
    if (!Number.isFinite(parsed.vialAmount) || !Number.isFinite(parsed.waterMl)) return '';
    if (parsed.vialAmount <= 0 || parsed.waterMl <= 0) return '';
    return formatConcentrationLabel(parsed.vialAmount / parsed.waterMl, parsed.vialUnit);
}

function buildResult(
    input: LabelModelInput,
    fields: {
        autoUnits: string;
        autoWater: string;
        autoConcentration: string;
        mergedPatch: Partial<LabelModelInput>;
    },
): ResolvedLabelMath {
    return {
        mergedInput: { ...input, ...fields.mergedPatch },
        autoUnits: fields.autoUnits,
        autoWater: fields.autoWater,
        autoConcentration: fields.autoConcentration,
    };
}

function calcForward(input: LabelModelInput, parsed: ParsedLabelMathInput): ResolvedLabelMath {
    const result = calculateDrawVolume({
        vialAmount: parsed.vialAmount,
        vialUnit: parsed.vialUnit,
        waterMl: parsed.waterMl,
        targetAmount: parsed.protocolAmount,
        targetUnit: parsed.protocolUnit,
    });
    if (!result) return defaultState(input);

    const autoUnits = formatDrawUnitsLabel(result.drawUnits);
    const autoConcentration = concentrationFromVialWater(parsed);

    return buildResult(input, {
        autoUnits,
        autoWater: '',
        autoConcentration,
        mergedPatch: {
            protocolUnits: input.protocolUnits || autoUnits,
            // Manual Entry: vial ÷ water is authoritative — never keep a stale stored concentration.
            concentration: autoConcentration,
        },
    });
}

function calcReverse(input: LabelModelInput, parsed: ParsedLabelMathInput): ResolvedLabelMath {
    const exactWaterMl = calculateReverseWater({
        vialAmount: parsed.vialAmount,
        vialUnit: parsed.vialUnit,
        drawUnits: parsed.drawUnits,
        targetAmount: parsed.protocolAmount,
        targetUnit: parsed.protocolUnit,
    });
    if (exactWaterMl == null) return defaultState(input);

    // Concentration from exact water — never from a display-rounded water string.
    const autoWater = formatWaterAmountLabel(exactWaterMl);
    const autoUnits = formatDrawUnitsLabel(parsed.drawUnits);
    const autoConcentration = formatConcentrationLabel(parsed.vialAmount / exactWaterMl, parsed.vialUnit);

    return buildResult(input, {
        autoUnits: '',
        autoWater,
        autoConcentration,
        mergedPatch: {
            reconstitutionAmount: autoWater,
            protocolUnits: autoUnits,
            concentration: autoConcentration,
        },
    });
}

function calcWaterFromTargetConcentration(input: LabelModelInput, parsed: ParsedLabelMathInput): ResolvedLabelMath {
    const exactWaterMl = calculateWaterFromTargetConcentration(parsed.vialAmount, parsed.targetConcentration);
    if (exactWaterMl == null) return defaultState(input);

    const autoWater = formatWaterAmountLabel(exactWaterMl);
    const autoConcentration = formatConcentrationLabel(parsed.targetConcentration, parsed.vialUnit);

    return buildResult(input, {
        autoUnits: '',
        autoWater,
        autoConcentration,
        mergedPatch: {
            reconstitutionAmount: autoWater,
            concentration: autoConcentration,
        },
    });
}

function calcFromConcentration(input: LabelModelInput, parsed: ParsedLabelMathInput): ResolvedLabelMath {
    const result = calculateFromTargetConcentration({
        vialAmount: parsed.vialAmount,
        vialUnit: parsed.vialUnit,
        targetConcentration: parsed.targetConcentration,
        targetAmount: parsed.protocolAmount,
        targetUnit: parsed.protocolUnit,
    });
    if (!result) return defaultState(input);

    const autoWater = formatWaterAmountLabel(result.waterMl);
    const autoUnits = result.drawUnits > 0
        ? formatDrawUnitsLabel(result.drawUnits)
        : formatDefaultDrawUnitsLabel(String(parsed.protocolAmount), input.measureUnit, parsed.vialUnit);
    const autoConcentration = formatConcentrationLabel(parsed.targetConcentration, parsed.vialUnit);

    return buildResult(input, {
        autoUnits,
        autoWater,
        autoConcentration,
        mergedPatch: {
            reconstitutionAmount: autoWater,
            protocolUnits: autoUnits,
            concentration: autoConcentration,
        },
    });
}

function defaultState(input: LabelModelInput): ResolvedLabelMath {
    return buildResult(input, { autoUnits: '', autoWater: '', autoConcentration: '', mergedPatch: {} });
}
