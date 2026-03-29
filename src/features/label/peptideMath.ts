export interface PeptideMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; waterMl?: number;
    doseAmount?: number; doseUnit: 'mg' | 'mcg' | 'IU';
}

export interface PeptideReverseMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; drawUnits?: number;
    doseAmount?: number; doseUnit: 'mg' | 'mcg' | 'IU';
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
    if (!i.waterMl || i.waterMl <= 0 || !i.doseAmount || i.doseAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.doseUnit === 'IU');
}

function getForwardVolumeMl(i: PeptideMathInput): number {
    if (i.vialUnit === 'IU') return i.doseAmount! / (i.vialAmount! / i.waterMl!);
    const doseMcg = i.doseUnit === 'mg' ? i.doseAmount! * 1000 : i.doseAmount!;
    return doseMcg / ((i.vialAmount! * 1000) / i.waterMl!);
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
    if (!i.drawUnits || i.drawUnits <= 0 || !i.doseAmount || i.doseAmount <= 0) return false;
    return (i.vialUnit === 'IU') === (i.doseUnit === 'IU');
}

function getReverseWaterMl(i: PeptideReverseMathInput): number {
    if (i.vialUnit === 'IU') return (i.drawUnits! * i.vialAmount!) / (i.doseAmount! * 100);
    const doseMcg = i.doseUnit === 'mg' ? i.doseAmount! * 1000 : i.doseAmount!;
    return (i.drawUnits! * (i.vialAmount! * 1000)) / (doseMcg * 100);
}