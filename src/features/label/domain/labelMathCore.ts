import type { LabelModelInput } from '../labelModel'
import {
    calculateDrawVolume,
    calculateReverseWater,
    calculateFromTargetConcentration,
    calculateWaterFromTargetConcentration,
    formatConcentrationLabel,
    formatDrawUnitsLabel,
    formatDefaultDrawUnitsLabel,
    formatWaterAmountLabel,
    parseNumericField,
    resolveCalculatorMode,
    resolveMeasureUnit,
    type CalculatorSolveMode,
} from '../peptideMath'
import { makeUnitWorld, type UnitWorld } from './units'

/** Derived calculator outputs — recomputed from authored inputs, never merged back. */
export interface ResolvedLabelMath {
    readonly autoUnits: string;
    readonly autoWater: string;
    readonly autoConcentration: string;
}

export interface ParsedLabelMathInput {
    compoundAmount: number;
    waterMl: number;
    protocolAmount: number;
    /** Null means the authored draw-units field is unparseable, not that it is zero. */
    drawUnits: number | null;
    targetConcentration: number;
    vialUnit: 'mg' | 'IU';
    /** Null when vialUnit and measureUnit form an unrepresentable pairing (see UnitWorld). */
    unitWorld: UnitWorld | null;
    mode: CalculatorSolveMode;
}

export function parseLabelMathInput(
    input: LabelModelInput,
    options: { readonly drawUnitsAreDerived?: boolean } = {},
): ParsedLabelMathInput {
    const vialUnit = (input.vialUnit || 'mg') as 'mg' | 'IU';
    const protocolUnits = options.drawUnitsAreDerived
        ? input.recommendedProtocolUnits || input.protocolUnits
        : input.protocolUnits || input.recommendedProtocolUnits
    const targetConcentration = input.targetConcentration || input.recommendedTargetConcentration
    // These four keep the '0' fallback deliberately, unlike the guard-feeding
    // '' fallbacks elsewhere in peptideMath.ts: they feed calcForward/calcReverse/
    // calcFromConcentration math directly, not just a `> 0` guard, and NaN would
    // propagate into label layout the golden snapshot covers.
    return {
        compoundAmount: parseFloat(input.compoundAmount || '0'),
        waterMl: parseFloat(input.reconstitutionAmount || '0'),
        protocolAmount: parseFloat(input.protocolAmount || '0'),
        drawUnits: parseNumericField(protocolUnits),
        targetConcentration: parseFloat(targetConcentration || '0'),
        vialUnit,
        unitWorld: makeUnitWorld(vialUnit, resolveMeasureUnit(vialUnit, input.measureUnit)),
        mode: resolveCalculatorMode(input),
    };
}

export function hasCompoundAmount(parsed: ParsedLabelMathInput): boolean {
    return Number.isFinite(parsed.compoundAmount) && parsed.compoundAmount > 0;
}

export function hasProtocolAmount(parsed: ParsedLabelMathInput): boolean {
    return Number.isFinite(parsed.protocolAmount) && parsed.protocolAmount > 0;
}

export function hasCompoundAndProtocol(parsed: ParsedLabelMathInput): boolean {
    return hasCompoundAmount(parsed) && hasProtocolAmount(parsed);
}

export function concentrationFromCompoundWater(parsed: ParsedLabelMathInput): string {
    if (!Number.isFinite(parsed.compoundAmount) || !Number.isFinite(parsed.waterMl)) return '';
    if (parsed.compoundAmount <= 0 || parsed.waterMl <= 0) return '';
    return formatConcentrationLabel(parsed.compoundAmount / parsed.waterMl, parsed.vialUnit);
}

export function buildResult(fields: {
    autoUnits: string;
    autoWater: string;
    autoConcentration: string;
}): ResolvedLabelMath {
    return {
        autoUnits: fields.autoUnits,
        autoWater: fields.autoWater,
        autoConcentration: fields.autoConcentration,
    };
}

export function defaultState(): ResolvedLabelMath {
    return buildResult({ autoUnits: '', autoWater: '', autoConcentration: '' });
}

export function calcForward(parsed: ParsedLabelMathInput): ResolvedLabelMath {
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — a null world here
    // is the same "invalid input" case as any other, so it takes the same fallback.
    if (!parsed.unitWorld) return defaultState();
    const result = calculateDrawVolume({
        compoundAmount: parsed.compoundAmount,
        unitWorld: parsed.unitWorld,
        waterMl: parsed.waterMl,
        protocolAmount: parsed.protocolAmount,
    });
    if (!result) return defaultState();

    // Manual Entry: vial ÷ water is authoritative — consumers prefer autoConcentration
    // over any stale authored concentration (see displayConcentration).
    return buildResult({
        autoUnits: formatDrawUnitsLabel(result.drawUnits),
        autoWater: '',
        autoConcentration: concentrationFromCompoundWater(parsed),
    });
}

export function calcReverse(parsed: ParsedLabelMathInput): ResolvedLabelMath {
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — a null world here
    // is the same "invalid input" case as any other, so it takes the same fallback.
    if (!parsed.unitWorld) return defaultState();
    // Every caller of calcReverse already checked parsed.drawUnits > 0 (null fails
    // that check), so this is defensive narrowing, not a new runtime guard.
    if (parsed.drawUnits == null) return defaultState();
    const exactWaterMl = calculateReverseWater({
        compoundAmount: parsed.compoundAmount,
        unitWorld: parsed.unitWorld,
        drawUnits: parsed.drawUnits,
        protocolAmount: parsed.protocolAmount,
    });
    if (exactWaterMl == null) return defaultState();

    // Concentration from exact water — never from a display-rounded water string.
    return buildResult({
        autoUnits: '',
        autoWater: formatWaterAmountLabel(exactWaterMl),
        autoConcentration: formatConcentrationLabel(parsed.compoundAmount / exactWaterMl, parsed.vialUnit),
    });
}

export function calcWaterFromTargetConcentration(parsed: ParsedLabelMathInput): ResolvedLabelMath {
    const exactWaterMl = calculateWaterFromTargetConcentration(parsed.compoundAmount, parsed.targetConcentration);
    if (exactWaterMl == null) return defaultState();

    return buildResult({
        autoUnits: '',
        autoWater: formatWaterAmountLabel(exactWaterMl),
        autoConcentration: formatConcentrationLabel(parsed.targetConcentration, parsed.vialUnit),
    });
}

export function calcFromConcentration(input: LabelModelInput, parsed: ParsedLabelMathInput): ResolvedLabelMath {
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — a null world here
    // is the same "invalid input" case as any other, so it takes the same fallback.
    if (!parsed.unitWorld) return defaultState();
    const result = calculateFromTargetConcentration({
        compoundAmount: parsed.compoundAmount,
        unitWorld: parsed.unitWorld,
        targetConcentration: parsed.targetConcentration,
        protocolAmount: parsed.protocolAmount,
    });
    if (!result) return defaultState();

    const autoUnits = result.drawUnits > 0
        ? formatDrawUnitsLabel(result.drawUnits)
        : formatDefaultDrawUnitsLabel(String(parsed.protocolAmount), input.measureUnit, parsed.vialUnit);

    return buildResult({
        autoUnits,
        autoWater: formatWaterAmountLabel(result.waterMl),
        autoConcentration: formatConcentrationLabel(parsed.targetConcentration, parsed.vialUnit),
    });
}

/**
 * The math shared by every solve mode once its own mode-specific condition
 * does not apply: forward math when water is known, reverse math when draw
 * units are known, otherwise the Manual Entry vial ÷ water fallback. Each
 * {@link SolveStrategy}'s `deriveMath` falls back to this after checking its
 * own mode's authoritative field.
 */
export function deriveGenericMath(parsed: ParsedLabelMathInput): ResolvedLabelMath {
    if (parsed.waterMl > 0 && hasCompoundAndProtocol(parsed)) return calcForward(parsed);
    if (hasCompoundAndProtocol(parsed) && parsed.drawUnits != null && parsed.drawUnits > 0) return calcReverse(parsed);

    // Manual Entry: vial ÷ water is authoritative — consumers prefer autoConcentration
    // over any stale authored concentration (see displayConcentration).
    return buildResult({
        autoUnits: '',
        autoWater: '',
        autoConcentration: concentrationFromCompoundWater(parsed),
    });
}
