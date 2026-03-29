import { describe, it, expect } from 'vitest'
import { calculateDrawVolume, calculateReverseWater } from './peptideMath'

describe('Peptide Math Engine', () => {

    it('should calculate 10 units when the vial is 10mg, water is 2ml, and dose is 500mcg', () => {
        const result = calculateDrawVolume({
            vialAmount: 10,
            vialUnit: 'mg',
            waterMl: 2,
            doseAmount: 500,
            doseUnit: 'mcg'
        })
        expect(result?.drawUnits).toBe(10)
    })

    it('should calculate 20 units when the vial is 10mg, water is 2ml, and dose is 1mg', () => {
        const result = calculateDrawVolume({ vialAmount: 10, vialUnit: 'mg', waterMl: 2, doseAmount: 1, doseUnit: 'mg' })
        expect(result?.drawUnits).toBe(20)
    })

    it('should calculate 10 units when the vial is 5000 IU, water is 2ml, and dose is 250 IU', () => {
        const result = calculateDrawVolume({ vialAmount: 5000, vialUnit: 'IU', waterMl: 2, doseAmount: 250, doseUnit: 'IU' })
        expect(result?.drawUnits).toBe(10)
    })

    it('should reject mismatched mass/activity units to prevent dangerous dosing', () => {
        expect(calculateDrawVolume({ vialAmount: 10, vialUnit: 'mg', waterMl: 2, doseAmount: 250, doseUnit: 'IU' })).toBeNull()
        expect(calculateDrawVolume({ vialAmount: 5000, vialUnit: 'IU', waterMl: 2, doseAmount: 500, doseUnit: 'mcg' })).toBeNull()
    })

    // --- NEW: REVERSE MATH TESTS ---
    it('should reverse calculate 2ml water when vial is 10mg, dose is 500mcg, and draw is 10 units', () => {
        const result = calculateReverseWater({
            vialAmount: 10,
            vialUnit: 'mg',
            drawUnits: 10,
            doseAmount: 500,
            doseUnit: 'mcg'
        })
        expect(result).toBe(2)
    })

    it('should reverse calculate 1ml water when vial is 5000 IU, dose is 250 IU, and draw is 5 units', () => {
        const result = calculateReverseWater({
            vialAmount: 5000,
            vialUnit: 'IU',
            drawUnits: 5,
            doseAmount: 250,
            doseUnit: 'IU'
        })
        expect(result).toBe(1)
    })

    it('should return null for reverse calculation if units are dangerously mixed', () => {
        expect(calculateReverseWater({ vialAmount: 10, vialUnit: 'mg', drawUnits: 10, doseAmount: 250, doseUnit: 'IU' })).toBeNull()
    })
})