import { DEFAULT_VIAL_CAPACITY_ML, normalizeVialCapacityMl } from './vialCapacity'
import {
    nextDrawUnitQuickPick,
    previousDrawUnitQuickPick,
} from './drawUnitsPolicy'
import { MCG_PER_MG, UNITS_PER_ML, protocolAmountInVialUnits } from './domain/units'

export { MCG_PER_MG, UNITS_PER_ML } from './domain/units'

export interface PeptideMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; waterMl?: number;
    targetAmount?: number; targetUnit: 'mg' | 'mcg' | 'IU';
}

export interface PeptideReverseMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; drawUnits?: number;
    targetAmount?: number; targetUnit: 'mg' | 'mcg' | 'IU';
}

export interface PeptideConcentrationSolveInput {
    vialAmount?: number;
    vialUnit: 'mg' | 'IU';
    targetConcentration?: number;
    targetAmount?: number;
    targetUnit: 'mg' | 'mcg' | 'IU';
}

export interface PeptideConcentrationSolveResult {
    waterMl: number;
    drawUnits: number;
    drawVolumeMl: number;
    concentrationMgPerMl?: number;
    concentrationIuPerMl?: number;
}

export type CalculatorSolveMode = 'standard' | 'round_concentration' | 'target_units';

export const DEFAULT_TARGET_CONCENTRATION = 10;
export const DEFAULT_DRAW_UNITS_PER_MG = 10;
export const DEFAULT_DRAW_UNITS_PER_IU = 10;
export const MIN_RECOMMENDED_WATER_ML = 1;

/** Display-only precision. Never round intermediate math to this — format at the UI/label boundary. */
export const DISPLAY_DECIMALS = 3;

export function roundForDisplay(value: number): number {
    const factor = 10 ** DISPLAY_DECIMALS;
    return Math.round(value * factor) / factor;
}

/** Round to three decimal places, then trim trailing zeros for compact display. */
export function formatDisplayNumber(value: number): string {
    const rounded = roundForDisplay(value);
    return rounded.toFixed(DISPLAY_DECIMALS).replace(/\.?0+$/, '');
}

/**
 * Fixed three-decimal display (e.g. measures per vial).
 * Never pass the result of this into subsequent math.
 */
export function formatDisplayNumberFixed(value: number): string {
    return roundForDisplay(value).toFixed(DISPLAY_DECIMALS);
}

/** Parses the numeric concentration from a label string such as "20mg per ml". */
export function parseConcentrationValue(concentration?: string): number | null {
    if (!concentration?.trim()) return null;
    const match = concentration.trim().match(/^([\d.]+)/);
    if (!match) return null;
    const value = parseFloat(match[0]);
    return value > 0 ? value : null;
}

export function resolveDefaultTargetConcentration(input: {
    concentration?: string;
    compoundAmount?: string;
    reconstitutionAmount?: string;
}, vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML): string {
    const fromLabel = parseConcentrationValue(input.concentration);
    if (fromLabel != null) return formatDisplayNumber(fromLabel);

    const v = parseFloat(input.compoundAmount || '0');
    const w = parseFloat(input.reconstitutionAmount || '0');
    if (v > 0 && w > 0) {
        return formatDisplayNumber(v / w);
    }

    if (!(v > 0)) return formatDisplayNumber(DEFAULT_TARGET_CONCENTRATION);

    const displayFactor = 10 ** DISPLAY_DECIMALS;
    const capacity = normalizeVialCapacityMl(vialCapacityMl);
    const minimumConcentration = Math.ceil(((v / capacity) * displayFactor) - 1e-9)
        / displayFactor;
    const maximumConcentration = Math.floor(((v / MIN_RECOMMENDED_WATER_ML) * displayFactor) + 1e-9)
        / displayFactor;
    const recommendedTarget = Math.min(
        maximumConcentration,
        Math.max(DEFAULT_TARGET_CONCENTRATION, minimumConcentration),
    );
    return formatDisplayNumber(recommendedTarget);
}

export function parseNumericField(value?: string): number {
    const source = value || '';
    const match = source.match(/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return 0;
    const remainder = source.slice(match[0].length).trim();
    if (/^[.\deE+-]/.test(remainder)) return 0;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveMeasureUnit(
    vialUnit: 'mg' | 'IU',
    measureUnit?: 'mg' | 'mcg' | 'IU',
): 'mg' | 'mcg' | 'IU' {
    return vialUnit === 'IU' ? 'IU' : (measureUnit || 'mcg');
}

export function formatConcentrationLabel(concentration: number, vialUnit: 'mg' | 'IU'): string {
    const suffix = vialUnit === 'IU' ? 'IU per ml' : 'mg per ml';
    return `${formatDisplayNumber(concentration)}${suffix}`;
}

export function formatWaterAmountLabel(waterMl: number): string {
    return formatDisplayNumber(waterMl);
}

export function formatDrawUnitsLabel(units: number): string {
    return `${formatDisplayNumber(units)} units`;
}

export function formatDefaultDrawUnitsLabel(
    protocolAmount: string | undefined,
    measureUnit: 'mg' | 'mcg' | 'IU' | undefined,
    vialUnit: 'mg' | 'IU' | undefined,
    compoundAmount?: string,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): string {
    const units = calculateRecommendedDrawUnits(
        parseFloat(protocolAmount || '0'),
        resolveMeasureUnit(vialUnit || 'mg', measureUnit),
        vialUnit || 'mg',
        parseFloat(compoundAmount || '0'),
        vialCapacityMl,
    );
    return units != null ? formatDrawUnitsLabel(units) : '';
}

export function hasPositiveDrawUnits(protocolUnits?: string): boolean {
    return parseNumericField(protocolUnits) > 0;
}

export function hasPositiveVialAmount(compoundAmount?: string): boolean {
    const vial = parseFloat(compoundAmount || '0');
    return Number.isFinite(vial) && vial > 0;
}

/** Draw-unit default for Set Draw Volume: flat 10 until vial amount is known, then 10 units per mg/IU. */
export function resolveDefaultDrawUnitsLabel(
    protocolAmount: string | undefined,
    measureUnit: 'mg' | 'mcg' | 'IU' | undefined,
    vialUnit: 'mg' | 'IU' | undefined,
    compoundAmount?: string,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): string {
    if (!protocolAmount?.trim() || parseFloat(protocolAmount) <= 0) return '';
    if (!hasPositiveVialAmount(compoundAmount)) {
        return formatDrawUnitsLabel(DEFAULT_DRAW_UNITS_PER_MG);
    }
    return formatDefaultDrawUnitsLabel(
        protocolAmount, measureUnit, vialUnit, compoundAmount, vialCapacityMl,
    );
}

export interface PeptideMathResult {
    drawUnits: number; drawVolumeMl: number;
    concentrationMgPerMl?: number; concentrationIuPerMl?: number;
}

export const RECONSTITUTION_TYPES = ['BAC Water', 'Sterile Water', 'Sodium Chloride 0.9%'] as const;

// --- FORWARD MATH ---
export function calculateDrawVolume(input: PeptideMathInput): PeptideMathResult | null {
    if (!isForwardValid(input)) return null;
    const volumeMl = getForwardVolumeMl(input);
    const concentration = input.vialAmount! / input.waterMl!;
    return formatResult(volumeMl, concentration, input.vialUnit === 'IU');
}

function isForwardValid(i: PeptideMathInput): boolean {
    if (!i.vialAmount || i.vialAmount <= 0) return false;
    if (!i.waterMl || i.waterMl <= 0 || !i.targetAmount || i.targetAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.targetUnit === 'IU');
}

function getForwardVolumeMl(i: PeptideMathInput): number {
    if (i.vialUnit === 'IU') return i.targetAmount! / (i.vialAmount! / i.waterMl!);
    const targetMcg = i.targetUnit === 'mg' ? i.targetAmount! * MCG_PER_MG : i.targetAmount!;
    return targetMcg / ((i.vialAmount! * MCG_PER_MG) / i.waterMl!);
}

function formatResult(vol: number, conc: number, isIu: boolean): PeptideMathResult {
    return {
        drawUnits: vol * UNITS_PER_ML,
        drawVolumeMl: vol,
        concentrationIuPerMl: isIu ? conc : undefined,
        concentrationMgPerMl: !isIu ? conc : undefined
    };
}

// --- REVERSE MATH ---
/** Exact water volume — do not round; format with {@link formatWaterAmountLabel} for display. */
export function calculateReverseWater(input: PeptideReverseMathInput): number | null {
    if (!isReverseValid(input)) return null;
    const waterMl = getReverseWaterMl(input);
    return waterMl > 0 ? waterMl : null;
}

function isReverseValid(i: PeptideReverseMathInput): boolean {
    if (!i.vialAmount || i.vialAmount <= 0) return false;
    if (!i.drawUnits || i.drawUnits <= 0 || !i.targetAmount || i.targetAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.targetUnit === 'IU');
}

function getReverseWaterMl(i: PeptideReverseMathInput): number {
    if (i.vialUnit === 'IU') return (i.drawUnits! * i.vialAmount!) / (i.targetAmount! * UNITS_PER_ML);
    const targetMcg = i.targetUnit === 'mg' ? i.targetAmount! * MCG_PER_MG : i.targetAmount!;
    return (i.drawUnits! * (i.vialAmount! * MCG_PER_MG)) / (targetMcg * UNITS_PER_ML);
}

// --- CONCENTRATION-TARGET SOLVE ---
/** Exact water from target concentration — format for display at the UI/label boundary. */
export function calculateWaterFromTargetConcentration(
    vialAmount: number,
    targetConcentration: number,
): number | null {
    if (!vialAmount || vialAmount <= 0 || !targetConcentration || targetConcentration <= 0) return null;
    const waterMl = vialAmount / targetConcentration;
    return waterMl > 0 ? waterMl : null;
}

export function calculateFromTargetConcentration(
    input: PeptideConcentrationSolveInput,
): PeptideConcentrationSolveResult | null {
    if (!isConcentrationSolveValid(input)) return null;

    const targetConcentration = input.targetConcentration!;
    const waterMl = calculateWaterFromTargetConcentration(input.vialAmount!, targetConcentration);
    if (waterMl == null) return null;

    const drawVolumeMl = calculateDrawVolumeFromTargetConcentration(
        input.targetAmount!,
        input.targetUnit,
        targetConcentration,
        input.vialUnit,
    );
    if (drawVolumeMl == null) return null;

    const isIu = input.vialUnit === 'IU';
    return {
        waterMl,
        drawUnits: drawVolumeMl * UNITS_PER_ML,
        drawVolumeMl,
        concentrationMgPerMl: !isIu ? targetConcentration : undefined,
        concentrationIuPerMl: isIu ? targetConcentration : undefined,
    };
}

/** Draw volume from target concentration — target is authoritative, not back-calculated vial ÷ rounded water. */
export function calculateDrawVolumeFromTargetConcentration(
    targetAmount: number,
    targetUnit: 'mg' | 'mcg' | 'IU',
    targetConcentration: number,
    vialUnit: 'mg' | 'IU',
): number | null {
    if (!targetAmount || targetAmount <= 0 || !targetConcentration || targetConcentration <= 0) return null;
    if (vialUnit === 'IU') {
        if (targetUnit !== 'IU') return null;
        return targetAmount / targetConcentration;
    }
    if (targetUnit === 'IU') return null;
    const targetMg = targetUnit === 'mg' ? targetAmount : targetAmount / MCG_PER_MG;
    return targetMg / targetConcentration;
}

function isConcentrationSolveValid(i: PeptideConcentrationSolveInput): boolean {
    if (!i.vialAmount || i.vialAmount <= 0) return false;
    if (!i.targetConcentration || i.targetConcentration <= 0) return false;
    if (!i.targetAmount || i.targetAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.targetUnit === 'IU');
}

/** Prefer 10 u/mg; if that would exceed this, use 5 u/mg instead for a smaller round draw. */
export const DRAW_UNITS_HIGH_THRESHOLD = 50;
export const DEFAULT_DRAW_UNITS_PER_MG_REDUCED = 5;
export const DEFAULT_DRAW_UNITS_PER_IU_REDUCED = 5;

/** Default draw units when Set Draw Volume uses 10 units per mg (or per IU). */
export function calculateDefaultDrawUnits(
    protocolAmount: number,
    measureUnit: 'mg' | 'mcg' | 'IU',
    vialUnit: 'mg' | 'IU',
): number | null {
    if (!protocolAmount || protocolAmount <= 0) return null;
    if (vialUnit === 'IU') {
        if (measureUnit !== 'IU') return null;
        const units = scaleDrawUnitsForAmount(protocolAmount, DEFAULT_DRAW_UNITS_PER_IU, DEFAULT_DRAW_UNITS_PER_IU_REDUCED);
        return units > 0 ? units : DEFAULT_DRAW_UNITS_PER_IU;
    }
    if (measureUnit === 'IU') return null;
    const amountMg = measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG;
    const units = scaleDrawUnitsForAmount(amountMg, DEFAULT_DRAW_UNITS_PER_MG, DEFAULT_DRAW_UNITS_PER_MG_REDUCED);
    if (units <= 0) return DEFAULT_DRAW_UNITS_PER_MG;
    if (units < 1) return DEFAULT_DRAW_UNITS_PER_MG;
    return units;
}

/**
 * System recommendation for Set Draw Volume. It preserves the normal 10/5-unit
 * policy, then adjusts generated values to keep water within the recommended
 * range. Explicit user choices remain unclamped.
 */
export function calculateRecommendedDrawUnits(
    protocolAmount: number,
    measureUnit: 'mg' | 'mcg' | 'IU',
    vialUnit: 'mg' | 'IU',
    vialAmount?: number,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): number | null {
    const standard = calculateDefaultDrawUnits(protocolAmount, measureUnit, vialUnit);
    if (standard == null) return null;
    if (!vialAmount || !Number.isFinite(vialAmount) || vialAmount <= 0) return standard;

    const protocolInVialUnits = protocolAmountInVialUnits(protocolAmount, measureUnit, vialUnit);
    if (protocolInVialUnits == null) return null;

    const minimumDrawUnits = (
        protocolInVialUnits
        * MIN_RECOMMENDED_WATER_ML
        * UNITS_PER_ML
    ) / vialAmount;
    // This recommendation is stored in a three-decimal form field. Round the
    // floor upward at that boundary so its displayed value cannot imply <1 ml.
    const displayFactor = 10 ** DISPLAY_DECIMALS;
    const displaySafeMinimum = Math.ceil((minimumDrawUnits * displayFactor) - 1e-9)
        / displayFactor;
    const maximumDrawUnits = (
        protocolInVialUnits
        * normalizeVialCapacityMl(vialCapacityMl)
        * UNITS_PER_ML
    ) / vialAmount;
    const displaySafeMaximum = Math.floor((maximumDrawUnits * displayFactor) + 1e-9)
        / displayFactor;
    if (standard < displaySafeMinimum) {
        const floorQuickPick = nextDrawUnitQuickPick(displaySafeMinimum);
        if (floorQuickPick != null && floorQuickPick <= displaySafeMaximum) {
            return floorQuickPick;
        }
    }
    if (standard > displaySafeMaximum) {
        const capacityQuickPick = previousDrawUnitQuickPick(displaySafeMaximum);
        if (capacityQuickPick != null && capacityQuickPick >= displaySafeMinimum) {
            return capacityQuickPick;
        }
    }
    return Math.min(displaySafeMaximum, Math.max(standard, displaySafeMinimum));
}

/**
 * 10 units per mg/IU by default. When that would exceed the high threshold,
 * use the reduced rate (5) so the suggested draw stays easier on a syringe.
 * Returns exact scaled values (no display rounding).
 */
export function scaleDrawUnitsForAmount(
    amount: number,
    fullRate: number,
    reducedRate: number,
): number {
    const full = amount * fullRate;
    if (full > DRAW_UNITS_HIGH_THRESHOLD) {
        return amount * reducedRate;
    }
    return full;
}