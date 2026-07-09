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
}): string {
    const fromLabel = parseConcentrationValue(input.concentration);
    if (fromLabel != null) return String(fromLabel);

    const v = parseFloat(input.compoundAmount || '0');
    const w = parseFloat(input.reconstitutionAmount || '0');
    if (v > 0 && w > 0) {
        return String(roundConcentration(v / w));
    }

    return String(DEFAULT_TARGET_CONCENTRATION);
}

export function parseNumericField(value?: string): number {
    const match = (value || '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
}

export function resolveMeasureUnit(
    vialUnit: 'mg' | 'IU',
    measureUnit?: 'mg' | 'mcg' | 'IU',
): 'mg' | 'mcg' | 'IU' {
    return vialUnit === 'IU' ? 'IU' : (measureUnit || 'mcg');
}

export function formatConcentrationLabel(concentration: number, vialUnit: 'mg' | 'IU'): string {
    const suffix = vialUnit === 'IU' ? 'IU per ml' : 'mg per ml';
    return `${roundConcentration(concentration)}${suffix}`;
}

export function formatDrawUnitsLabel(units: number): string {
    return `${units} units`;
}

export function formatDefaultDrawUnitsLabel(
    protocolAmount: string | undefined,
    measureUnit: 'mg' | 'mcg' | 'IU' | undefined,
    vialUnit: 'mg' | 'IU' | undefined,
): string {
    const units = calculateDefaultDrawUnits(
        parseFloat(protocolAmount || '0'),
        resolveMeasureUnit(vialUnit || 'mg', measureUnit),
        vialUnit || 'mg',
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
): string {
    if (!protocolAmount?.trim() || parseFloat(protocolAmount) <= 0) return '';
    if (!hasPositiveVialAmount(compoundAmount)) {
        return formatDrawUnitsLabel(DEFAULT_DRAW_UNITS_PER_MG);
    }
    return formatDefaultDrawUnitsLabel(protocolAmount, measureUnit, vialUnit);
}

function roundConcentration(concentration: number): number {
    return Math.round(concentration * 100) / 100;
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
    const targetMcg = i.targetUnit === 'mg' ? i.targetAmount! * 1000 : i.targetAmount!;
    return targetMcg / ((i.vialAmount! * 1000) / i.waterMl!);
}

function formatResult(vol: number, conc: number, isIu: boolean): PeptideMathResult {
    return {
        drawUnits: Math.round((vol * 100) * 10) / 10,
        drawVolumeMl: Math.round(vol * 1000) / 1000,
        concentrationIuPerMl: isIu ? conc : undefined,
        concentrationMgPerMl: !isIu ? conc : undefined
    };
}

// --- REVERSE MATH ---
export function calculateReverseWater(input: PeptideReverseMathInput): number | null {
    if (!isReverseValid(input)) return null;
    const waterMl = getReverseWaterMl(input);
    return Math.round(waterMl * 100) / 100;
}

function isReverseValid(i: PeptideReverseMathInput): boolean {
    if (!i.vialAmount || i.vialAmount <= 0) return false;
    if (!i.drawUnits || i.drawUnits <= 0 || !i.targetAmount || i.targetAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.targetUnit === 'IU');
}

function getReverseWaterMl(i: PeptideReverseMathInput): number {
    if (i.vialUnit === 'IU') return (i.drawUnits! * i.vialAmount!) / (i.targetAmount! * 100);
    const targetMcg = i.targetUnit === 'mg' ? i.targetAmount! * 1000 : i.targetAmount!;
    return (i.drawUnits! * (i.vialAmount! * 1000)) / (targetMcg * 100);
}

// --- CONCENTRATION-TARGET SOLVE ---
export function calculateWaterFromTargetConcentration(
    vialAmount: number,
    targetConcentration: number,
): number | null {
    if (!vialAmount || vialAmount <= 0 || !targetConcentration || targetConcentration <= 0) return null;
    const waterMl = roundWaterMl(vialAmount / targetConcentration);
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
        drawUnits: roundDrawUnits(drawVolumeMl * 100),
        drawVolumeMl: Math.round(drawVolumeMl * 1000) / 1000,
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
    const targetMg = targetUnit === 'mg' ? targetAmount : targetAmount / 1000;
    return targetMg / targetConcentration;
}

function isConcentrationSolveValid(i: PeptideConcentrationSolveInput): boolean {
    if (!i.vialAmount || i.vialAmount <= 0) return false;
    if (!i.targetConcentration || i.targetConcentration <= 0) return false;
    if (!i.targetAmount || i.targetAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.targetUnit === 'IU');
}

function roundWaterMl(waterMl: number): number {
    return Math.round(waterMl * 100) / 100;
}

/** Default draw units when Set Draw Volume uses 10 units per mg (or per IU). */
export function calculateDefaultDrawUnits(
    protocolAmount: number,
    measureUnit: 'mg' | 'mcg' | 'IU',
    vialUnit: 'mg' | 'IU',
): number | null {
    if (!protocolAmount || protocolAmount <= 0) return null;
    if (vialUnit === 'IU') {
        if (measureUnit !== 'IU') return null;
        const units = roundDrawUnits(protocolAmount * DEFAULT_DRAW_UNITS_PER_IU);
        return units > 0 ? units : DEFAULT_DRAW_UNITS_PER_IU;
    }
    if (measureUnit === 'IU') return null;
    const amountMg = measureUnit === 'mg' ? protocolAmount : protocolAmount / 1000;
    const units = roundDrawUnits(amountMg * DEFAULT_DRAW_UNITS_PER_MG);
    if (units <= 0) return DEFAULT_DRAW_UNITS_PER_MG;
    if (units < 1) return DEFAULT_DRAW_UNITS_PER_MG;
    return units;
}

function roundDrawUnits(units: number): number {
    return Math.round(units * 10) / 10;
}