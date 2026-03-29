export interface PeptideMathInput {
    vialAmount: number | undefined
    vialUnit: 'mg' | 'IU'
    waterMl: number | undefined
    doseAmount: number | undefined
    doseUnit: 'mg' | 'mcg' | 'IU'
}

export interface PeptideMathResult {
    drawUnits: number
    drawVolumeMl: number
    concentrationMgPerMl?: number
    concentrationIuPerMl?: number
}

export function calculateDrawVolume(input: PeptideMathInput): PeptideMathResult | null {
    if (!input.vialAmount || input.vialAmount <= 0) return null
    if (!input.waterMl || input.waterMl <= 0) return null
    if (!input.doseAmount || input.doseAmount <= 0) return null

    const isIuVial = input.vialUnit === 'IU'
    const isIuDose = input.doseUnit === 'IU'
    if (isIuVial !== isIuDose) return null

    let drawVolumeMl = 0;
    let concentrationMgPerMl: number | undefined = undefined;
    let concentrationIuPerMl: number | undefined = undefined;

    if (isIuVial) {
        concentrationIuPerMl = input.vialAmount / input.waterMl
        drawVolumeMl = input.doseAmount / concentrationIuPerMl
    } else {
        const totalVialMcg = input.vialAmount * 1000
        const doseMcg = input.doseUnit === 'mg' ? input.doseAmount * 1000 : input.doseAmount
        concentrationMgPerMl = input.vialAmount / input.waterMl
        const concentrationMcgPerMl = totalVialMcg / input.waterMl
        drawVolumeMl = doseMcg / concentrationMcgPerMl
    }

    const rawUnits = drawVolumeMl * 100
    const roundedUnits = Math.round(rawUnits * 10) / 10
    const roundedVolumeMl = Math.round(drawVolumeMl * 1000) / 1000

    return {
        drawUnits: roundedUnits,
        drawVolumeMl: roundedVolumeMl,
        concentrationMgPerMl,
        concentrationIuPerMl
    }
}

export interface PeptideReverseMathInput {
    vialAmount: number | undefined
    vialUnit: 'mg' | 'IU'
    drawUnits: number | undefined
    doseAmount: number | undefined
    doseUnit: 'mg' | 'mcg' | 'IU'
}

export function calculateReverseWater(input: PeptideReverseMathInput): number | null {
    if (!input.vialAmount || input.vialAmount <= 0) return null
    if (!input.drawUnits || input.drawUnits <= 0) return null
    if (!input.doseAmount || input.doseAmount <= 0) return null

    const isIuVial = input.vialUnit === 'IU'
    const isIuDose = input.doseUnit === 'IU'
    if (isIuVial !== isIuDose) return null

    let waterMl = 0;

    if (isIuVial) {
        waterMl = (input.drawUnits * input.vialAmount) / (input.doseAmount * 100)
    } else {
        const totalVialMcg = input.vialAmount * 1000
        const doseMcg = input.doseUnit === 'mg' ? input.doseAmount * 1000 : input.doseAmount
        waterMl = (input.drawUnits * totalVialMcg) / (doseMcg * 100)
    }

    return Math.round(waterMl * 100) / 100
}

export const RECONSTITUTION_TYPES = [
    'BAC Water',
    'Sterile Water',
    'Sodium Chloride 0.9%'
] as const;