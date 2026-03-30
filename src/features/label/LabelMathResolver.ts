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

    return defaultState(input);
}

function parseUnits(unitsStr?: string): number {
    const match = (unitsStr || '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
}

function calcForward(input: LabelModelInput, v: number, w: number, d: number, vUnit: 'mg' | 'IU', dUnit: 'mg' | 'mcg' | 'IU'): ResolvedLabelMath {
    const res = calculateDrawVolume({ vialAmount: v, vialUnit: vUnit, waterMl: w, doseAmount: d, doseUnit: dUnit });
    if (!res) return defaultState(input);

    const autoU = `${res.drawUnits} units`;
    const conc = Math.round((v / w) * 100) / 100;
    const autoC = `${conc}${vUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;

    return {
        mergedInput: {
            ...input,
            protocolUnits: input.protocolUnits || autoU,
            concentration: input.concentration || autoC
        },
        autoUnits: autoU,
        autoWater: '', // Strict separation: We did not auto-calculate water here
        autoConcentration: autoC
    };
}

function calcReverse(input: LabelModelInput, v: number, u: number, d: number, vUnit: 'mg' | 'IU', dUnit: 'mg' | 'mcg' | 'IU'): ResolvedLabelMath {
    const res = calculateReverseWater({ vialAmount: v, vialUnit: vUnit, drawUnits: u, doseAmount: d, doseUnit: dUnit });
    if (!res) return defaultState(input);

    const autoW = res.toString();
    const conc = Math.round((v / res) * 100) / 100;
    const autoC = `${conc}${vUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;

    return {
        mergedInput: {
            ...input,
            reconstitutionAmount: input.reconstitutionAmount || autoW,
            concentration: input.concentration || autoC
        },
        autoUnits: '', // Strict separation: We did not auto-calculate units here
        autoWater: autoW,
        autoConcentration: autoC
    };
}

function defaultState(input: LabelModelInput): ResolvedLabelMath {
    return { mergedInput: input, autoUnits: '', autoWater: '', autoConcentration: '' };
}