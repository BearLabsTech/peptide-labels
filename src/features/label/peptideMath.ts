import { DEFAULT_VIAL_CAPACITY_ML, normalizeVialCapacityMl } from './vialCapacity'
import {
    nextDrawUnitQuickPick,
    previousDrawUnitQuickPick,
} from './drawUnitsPolicy'
import { MCG_PER_MG, UNITS_PER_ML, makeUnitWorld, protocolAmountInVialUnits, type UnitWorld } from './domain/units'

export { MCG_PER_MG, UNITS_PER_ML } from './domain/units'
export type { UnitWorld } from './domain/units'

export interface PeptideMathInput {
    compoundAmount?: number; unitWorld: UnitWorld; waterMl?: number;
    protocolAmount?: number;
}

export interface PeptideReverseMathInput {
    compoundAmount?: number; unitWorld: UnitWorld; drawUnits?: number;
    protocolAmount?: number;
}

export interface PeptideConcentrationSolveInput {
    compoundAmount?: number;
    unitWorld: UnitWorld;
    targetConcentration?: number;
    protocolAmount?: number;
}

export interface PeptideConcentrationSolveResult {
    waterMl: number;
    drawUnits: number;
    drawVolumeMl: number;
    concentrationMgPerMl?: number;
    concentrationIuPerMl?: number;
}

export type CalculatorSolveMode = 'standard' | 'round_concentration' | 'target_units';

/**
 * Fresh-session default assist mode (calculator and label designer) — Set
 * Draw Volume, per the FRD. Single source of truth: every caller that must
 * fall back when `LabelModelInput.calculatorSolveMode` is unset imports this
 * constant rather than hard-coding its own default.
 */
export const DEFAULT_CALCULATOR_SOLVE_MODE: CalculatorSolveMode = 'target_units';

/**
 * Single source of truth for applying the mode default. Every caller that
 * needs the current calculator mode imports this instead of inlining its
 * own `calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE` fallback.
 */
export function resolveCalculatorMode(
    input: { calculatorSolveMode?: CalculatorSolveMode },
): CalculatorSolveMode {
    return input.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE;
}

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

    const v = parseFloat(input.compoundAmount || '');
    const w = parseFloat(input.reconstitutionAmount || '');
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

/** Null means "not a number" — distinct from a user-entered zero. */
export function parseNumericField(value?: string): number | null {
    const source = value || '';
    const match = source.match(/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return null;
    const remainder = source.slice(match[0].length).trim();
    if (/^[.\deE+-]/.test(remainder)) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
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
    const resolvedVialUnit = vialUnit || 'mg';
    const unitWorld = makeUnitWorld(resolvedVialUnit, resolveMeasureUnit(resolvedVialUnit, measureUnit));
    if (!unitWorld) return ''; // unrepresentable: UnitWorld pairs vialUnit with measureUnit
    const units = calculateRecommendedDrawUnits(
        parseFloat(protocolAmount || ''),
        unitWorld,
        parseFloat(compoundAmount || ''),
        vialCapacityMl,
    );
    return units != null ? formatDrawUnitsLabel(units) : '';
}

export function hasPositiveDrawUnits(protocolUnits?: string): boolean {
    return (parseNumericField(protocolUnits) ?? 0) > 0;
}

export function hasPositiveCompoundAmount(compoundAmount?: string): boolean {
    const amount = parseFloat(compoundAmount || '');
    return Number.isFinite(amount) && amount > 0;
}

/** Draw-unit default for Set Draw Volume: flat 10 until compound amount is known, then 10 units per mg/IU. */
export function resolveDefaultDrawUnitsLabel(
    protocolAmount: string | undefined,
    measureUnit: 'mg' | 'mcg' | 'IU' | undefined,
    vialUnit: 'mg' | 'IU' | undefined,
    compoundAmount?: string,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): string {
    if (!protocolAmount?.trim() || parseFloat(protocolAmount) <= 0) return '';
    if (!hasPositiveCompoundAmount(compoundAmount)) {
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

type ValidForwardInput = PeptideMathInput & {
    compoundAmount: number
    waterMl: number
    protocolAmount: number
}

type ValidReverseInput = PeptideReverseMathInput & {
    compoundAmount: number
    drawUnits: number
    protocolAmount: number
}

type ValidConcentrationSolveInput = PeptideConcentrationSolveInput & {
    compoundAmount: number
    targetConcentration: number
    protocolAmount: number
}

// --- FORWARD MATH ---
export function calculateDrawVolume(input: PeptideMathInput): PeptideMathResult | null {
    const valid = asValidForwardInput(input);
    if (!valid) return null;
    const volumeMl = getForwardVolumeMl(valid);
    const concentration = valid.compoundAmount / valid.waterMl;
    return formatResult(volumeMl, concentration, valid.unitWorld.vialUnit === 'IU');
}

function asValidForwardInput(i: PeptideMathInput): ValidForwardInput | null {
    if (!i.compoundAmount || i.compoundAmount <= 0) return null;
    if (!i.waterMl || i.waterMl <= 0 || !i.protocolAmount || i.protocolAmount <= 0) return null;
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — no mismatch to guard here.
    return i as ValidForwardInput;
}

function getForwardVolumeMl(i: ValidForwardInput): number {
    if (i.unitWorld.vialUnit === 'IU') return i.protocolAmount / (i.compoundAmount / i.waterMl);
    const targetMcg = i.unitWorld.measureUnit === 'mg' ? i.protocolAmount * MCG_PER_MG : i.protocolAmount;
    return targetMcg / ((i.compoundAmount * MCG_PER_MG) / i.waterMl);
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
    const valid = asValidReverseInput(input);
    if (!valid) return null;
    const waterMl = getReverseWaterMl(valid);
    return waterMl > 0 ? waterMl : null;
}

function asValidReverseInput(i: PeptideReverseMathInput): ValidReverseInput | null {
    if (!i.compoundAmount || i.compoundAmount <= 0) return null;
    if (!i.drawUnits || i.drawUnits <= 0 || !i.protocolAmount || i.protocolAmount <= 0) return null;
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — no mismatch to guard here.
    return i as ValidReverseInput;
}

function getReverseWaterMl(i: ValidReverseInput): number {
    if (i.unitWorld.vialUnit === 'IU') return (i.drawUnits * i.compoundAmount) / (i.protocolAmount * UNITS_PER_ML);
    const targetMcg = i.unitWorld.measureUnit === 'mg' ? i.protocolAmount * MCG_PER_MG : i.protocolAmount;
    return (i.drawUnits * (i.compoundAmount * MCG_PER_MG)) / (targetMcg * UNITS_PER_ML);
}

// --- CONCENTRATION-TARGET SOLVE ---
/** Exact water from target concentration — format for display at the UI/label boundary. */
export function calculateWaterFromTargetConcentration(
    compoundAmount: number,
    targetConcentration: number,
): number | null {
    if (!compoundAmount || compoundAmount <= 0 || !targetConcentration || targetConcentration <= 0) return null;
    const waterMl = compoundAmount / targetConcentration;
    return waterMl > 0 ? waterMl : null;
}

export function calculateFromTargetConcentration(
    input: PeptideConcentrationSolveInput,
): PeptideConcentrationSolveResult | null {
    const valid = asValidConcentrationSolveInput(input);
    if (!valid) return null;

    const waterMl = calculateWaterFromTargetConcentration(valid.compoundAmount, valid.targetConcentration);
    if (waterMl == null) return null;

    const drawVolumeMl = calculateDrawVolumeFromTargetConcentration(
        valid.protocolAmount,
        valid.targetConcentration,
        valid.unitWorld,
    );
    if (drawVolumeMl == null) return null;

    const isIu = valid.unitWorld.vialUnit === 'IU';
    return {
        waterMl,
        drawUnits: drawVolumeMl * UNITS_PER_ML,
        drawVolumeMl,
        concentrationMgPerMl: !isIu ? valid.targetConcentration : undefined,
        concentrationIuPerMl: isIu ? valid.targetConcentration : undefined,
    };
}

/** Draw volume from target concentration — target is authoritative, not back-calculated vial ÷ rounded water. */
export function calculateDrawVolumeFromTargetConcentration(
    protocolAmount: number,
    targetConcentration: number,
    unitWorld: UnitWorld,
): number | null {
    if (!protocolAmount || protocolAmount <= 0 || !targetConcentration || targetConcentration <= 0) return null;
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — no mismatch to guard here.
    if (unitWorld.vialUnit === 'IU') return protocolAmount / targetConcentration;
    const targetMg = unitWorld.measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG;
    return targetMg / targetConcentration;
}

function asValidConcentrationSolveInput(i: PeptideConcentrationSolveInput): ValidConcentrationSolveInput | null {
    if (!i.compoundAmount || i.compoundAmount <= 0) return null;
    if (!i.targetConcentration || i.targetConcentration <= 0) return null;
    if (!i.protocolAmount || i.protocolAmount <= 0) return null;
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — no mismatch to guard here.
    return i as ValidConcentrationSolveInput;
}

/** Prefer 10 u/mg; if that would exceed this, use 5 u/mg instead for a smaller round draw. */
export const DRAW_UNITS_HIGH_THRESHOLD = 50;
export const DEFAULT_DRAW_UNITS_PER_MG_REDUCED = 5;
export const DEFAULT_DRAW_UNITS_PER_IU_REDUCED = 5;

/** Default draw units when Set Draw Volume uses 10 units per mg (or per IU). */
export function calculateDefaultDrawUnits(
    protocolAmount: number,
    unitWorld: UnitWorld,
): number | null {
    if (!protocolAmount || protocolAmount <= 0) return null;
    // unrepresentable: UnitWorld pairs vialUnit with measureUnit — no mismatch to guard here.
    if (unitWorld.vialUnit === 'IU') {
        const units = scaleDrawUnitsForAmount(protocolAmount, DEFAULT_DRAW_UNITS_PER_IU, DEFAULT_DRAW_UNITS_PER_IU_REDUCED);
        return units > 0 ? units : DEFAULT_DRAW_UNITS_PER_IU;
    }
    const amountMg = unitWorld.measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG;
    const units = scaleDrawUnitsForAmount(amountMg, DEFAULT_DRAW_UNITS_PER_MG, DEFAULT_DRAW_UNITS_PER_MG_REDUCED);
    return units;
}

/**
 * System recommendation for Set Draw Volume. It preserves the normal 10/5-unit
 * policy, then adjusts generated values to keep water within the recommended
 * range. Explicit user choices remain unclamped.
 */
export function calculateRecommendedDrawUnits(
    protocolAmount: number,
    unitWorld: UnitWorld,
    compoundAmount?: number,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): number | null {
    const standard = calculateDefaultDrawUnits(protocolAmount, unitWorld);
    if (standard == null) return null;
    if (!compoundAmount || !Number.isFinite(compoundAmount) || compoundAmount <= 0) return standard;

    const protocolInVialUnits = protocolAmountInVialUnits(protocolAmount, unitWorld);

    const minimumDrawUnits = (
        protocolInVialUnits
        * MIN_RECOMMENDED_WATER_ML
        * UNITS_PER_ML
    ) / compoundAmount;
    // This recommendation is stored in a three-decimal form field. Round the
    // floor upward at that boundary so its displayed value cannot imply <1 ml.
    const displayFactor = 10 ** DISPLAY_DECIMALS;
    const displaySafeMinimum = Math.ceil((minimumDrawUnits * displayFactor) - 1e-9)
        / displayFactor;
    const maximumDrawUnits = (
        protocolInVialUnits
        * normalizeVialCapacityMl(vialCapacityMl)
        * UNITS_PER_ML
    ) / compoundAmount;
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