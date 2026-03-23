import { describe, it, expect } from 'vitest'
import { calculateDrawVolume } from './peptideMath'

describe('Peptide Math Engine', () => {

    it('should calculate 10 units when the vial is 10mg, water is 2ml, and dose is 500mcg', () => {
        const result = calculateDrawVolume({
            vialMg: 10,
            waterMl: 2,
            doseAmount: 500,
            doseUnit: 'mcg'
        })
        expect(result?.drawUnits).toBe(10)
    })

    it('should calculate 3.1 units when the vial is 32.2mg, water is 2ml, and dose is 500mcg', () => {
        const result = calculateDrawVolume({
            vialMg: 32.2,
            waterMl: 2,
            doseAmount: 500,
            doseUnit: 'mcg'
        })
        expect(result?.drawUnits).toBe(3.1)
    })

    it('should calculate 20 units when the vial is 10mg, water is 2ml, and dose is 1000mcg', () => {
        const result = calculateDrawVolume({
            vialMg: 10,
            waterMl: 2,
            doseAmount: 1000,
            doseUnit: 'mcg'
        })
        expect(result?.drawUnits).toBe(20)
    })

    it('should calculate 20 units when the vial is 10mg, water is 2ml, and dose is 1mg', () => {
        const result = calculateDrawVolume({
            vialMg: 10,
            waterMl: 2,
            doseAmount: 1,
            doseUnit: 'mg'
        })
        expect(result?.drawUnits).toBe(20)
    })

    it('should handle mg dose inputs natively (e.g. 2.5mg instead of 2500mcg)', () => {
        const resultMcg = calculateDrawVolume({ vialMg: 10, waterMl: 1, doseAmount: 2500, doseUnit: 'mcg' })
        const resultMg = calculateDrawVolume({ vialMg: 10, waterMl: 1, doseAmount: 2.5, doseUnit: 'mg' })

        expect(resultMg?.drawUnits).toBe(25)
        expect(resultMcg?.drawUnits).toBe(resultMg?.drawUnits)
    })

    it('should return null if critical data is missing or zero to prevent infinite math errors', () => {
        expect(calculateDrawVolume({ vialMg: 10, waterMl: 0, doseAmount: 500, doseUnit: 'mcg' })).toBeNull()
        expect(calculateDrawVolume({ vialMg: 0, waterMl: 2, doseAmount: 500, doseUnit: 'mcg' })).toBeNull()
    })

    it('should calculate the concentration accurately for the label', () => {
        const result = calculateDrawVolume({
            vialMg: 10,
            waterMl: 2,
            doseAmount: 500,
            doseUnit: 'mcg'
        })
        expect(result?.concentrationMgPerMl).toBe(5)
    })
})