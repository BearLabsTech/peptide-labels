export interface PeptideMathInput {
    vialMg: number | undefined
    waterMl: number | undefined
    doseAmount: number | undefined
    doseUnit: 'mg' | 'mcg'
}

export interface PeptideMathResult {
    drawUnits: number           // "Pull the syringe to X"
    drawVolumeMl: number        // Actual liquid volume
    concentrationMgPerMl: number // For the label printout
}

export function calculateDrawVolume(input: PeptideMathInput): PeptideMathResult | null {
    // 1. Validate inputs: Prevent divide-by-zero or NaN errors
    if (!input.vialMg || input.vialMg <= 0) return null
    if (!input.waterMl || input.waterMl <= 0) return null
    if (!input.doseAmount || input.doseAmount <= 0) return null

    // 2. Standardize everything to micrograms (mcg) for safe calculation
    const totalVialMcg = input.vialMg * 1000
    const doseMcg = input.doseUnit === 'mg' ? input.doseAmount * 1000 : input.doseAmount

    // 3. Calculate concentrations
    const concentrationMcgPerMl = totalVialMcg / input.waterMl
    const concentrationMgPerMl = input.vialMg / input.waterMl

    // 4. Calculate actual liquid draw volume
    const drawVolumeMl = doseMcg / concentrationMcgPerMl

    // 5. Convert to U-100 insulin syringe units (1 ml = 100 units)
    const rawUnits = drawVolumeMl * 100

    // 6. Round to practical syringe measurements (1 decimal place)
    const roundedUnits = Math.round(rawUnits * 10) / 10
    const roundedVolumeMl = Math.round(drawVolumeMl * 1000) / 1000

    return {
        drawUnits: roundedUnits,
        drawVolumeMl: roundedVolumeMl,
        concentrationMgPerMl: concentrationMgPerMl
    }
}

// A handy list of common reconstitution liquids for our dropdown
export const RECONSTITUTION_TYPES = [
    'BAC Water',
    'Sterile Water',
    'Sodium Chloride 0.9%'
] as const;