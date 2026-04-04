export interface PeptideMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; waterMl?: number;
    targetAmount?: number; targetUnit: 'mg' | 'mcg' | 'IU';
}

export interface PeptideReverseMathInput {
    vialAmount?: number; vialUnit: 'mg' | 'IU'; drawUnits?: number;
    targetAmount?: number; targetUnit: 'mg' | 'mcg' | 'IU';
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