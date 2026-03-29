import type { LabelModelInput } from './labelModel'
import { calculateDrawVolume, calculateReverseWater } from './peptideMath'

export interface ResolvedLabelMath {
    mergedInput: LabelModelInput;
    autoUnits: string;
    autoWater: string;
    autoConcentration: string;
}

export function resolveLabelMath(input: LabelModelInput): ResolvedLabelMath {
    const v = parseFloat(input.compoundAmount || '0')
    const w = parseFloat(input.reconstitutionAmount || '0')
    const d = parseFloat(input.protocolAmount || '0')
    const u = parseUnits(input.protocolUnits)

    const vUnit = (input.vialUnit || 'mg') as 'mg' | 'IU'
    const dUnit = (vUnit === 'IU' ? 'IU' : (input.doseUnit || 'mcg')) as 'mg' | 'mcg' | 'IU'

    if (w > 0 && v > 0 && d > 0) return calcForward(input, v, w, d, vUnit, dUnit);
    if (u > 0 && v > 0 && d > 0) return calcReverse(input, v, u, d, vUnit, dUnit);

    return { mergedInput: input, autoUnits: '', autoWater: '', autoConcentration: '' };
}

function parseUnits(unitsStr?: string): number {
    const match = (unitsStr || '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
}

function calcForward(input: LabelModelInput, v: number, w: number, d: number, vUnit: any, dUnit: any) {
    const res = calculateDrawVolume({ vialAmount: v, vialUnit: vUnit, waterMl: w, doseAmount: d, doseUnit: dUnit });
    if (!res) return defaultState(input);
    return buildResolvedState(input, v, w, `${res.drawUnits} units`, input.reconstitutionAmount || '', vUnit);
}

function calcReverse(input: LabelModelInput, v: number, u: number, d: number, vUnit: any, dUnit: any) {
    const res = calculateReverseWater({ vialAmount: v, vialUnit: vUnit, drawUnits: u, doseAmount: d, doseUnit: dUnit });
    if (!res) return defaultState(input);
    return buildResolvedState(input, v, res, input.protocolUnits || '', res.toString(), vUnit);
}

function buildResolvedState(input: LabelModelInput, vial: number, water: number, finalU: string, finalW: string, vUnit: string) {
    const conc = Math.round((vial / water) * 100) / 100;
    const finalC = input.concentration || `${conc}${vUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;
    const mergedInput = { ...input, reconstitutionAmount: finalW, protocolUnits: finalU, concentration: finalC };
    return { mergedInput, autoUnits: finalU, autoWater: finalW, autoConcentration: finalC };
}

function defaultState(input: LabelModelInput) {
    return { mergedInput: input, autoUnits: '', autoWater: '', autoConcentration: '' };
}