import { describe, it, expect } from 'vitest'
import { calculateDrawVolume, calculateReverseWater } from './peptideMath'

describe('Peptide Math Engine', () => {

    // --- FORWARD MATH TESTS ---
    it('should calculate exactly 10 units and 5mg/ml conc when vial is 10mg, water is 2ml, and dose is 500mcg', () => {
        const result = calculateDrawVolume({
            vialAmount: 10, vialUnit: 'mg',
            waterMl: 2, doseAmount: 500, doseUnit: 'mcg'
        })
        // Strict object equality prevents Concentration Poisoning
        expect(result).toEqual({
            drawUnits: 10,
            drawVolumeMl: 0.1,
            concentrationMgPerMl: 5,
            concentrationIuPerMl: undefined
        })
    })

    it('should calculate exactly 20 units when the vial is 10mg, water is 2ml, and dose is 1mg', () => {
        const result = calculateDrawVolume({
            vialAmount: 10, vialUnit: 'mg',
            waterMl: 2, doseAmount: 1, doseUnit: 'mg'
        })
        expect(result).toEqual({
            drawUnits: 20,
            drawVolumeMl: 0.2,
            concentrationMgPerMl: 5,
            concentrationIuPerMl: undefined
        })
    })

    it('should calculate exactly 10 units and 2500IU/ml conc when the vial is 5000 IU, water is 2ml, and dose is 250 IU', () => {
        const result = calculateDrawVolume({
            vialAmount: 5000, vialUnit: 'IU',
            waterMl: 2, doseAmount: 250, doseUnit: 'IU'
        })
        expect(result).toEqual({
            drawUnits: 10,
            drawVolumeMl: 0.1,
            concentrationMgPerMl: undefined,
            concentrationIuPerMl: 2500
        })
    })

    // BLOCKS ATTACK 1: Fractional rounding test ensures Math.round() cannot be swapped for Math.floor()
    it('should calculate 3.1 units for fractional math (32.2mg vial, 2ml water, 500mcg dose)', () => {
        const result = calculateDrawVolume({
            vialAmount: 32.2, vialUnit: 'mg',
            waterMl: 2, doseAmount: 500, doseUnit: 'mcg'
        })
        expect(result).toEqual({
            drawUnits: 3.1, // 3.105 strictly rounded to 3.1
            drawVolumeMl: 0.031,
            concentrationMgPerMl: 16.1,
            concentrationIuPerMl: undefined
        })
    })

    it('should reject mismatched mass/activity units to prevent dangerous dosing', () => {
        expect(calculateDrawVolume({ vialAmount: 10, vialUnit: 'mg', waterMl: 2, doseAmount: 250, doseUnit: 'IU' })).toBeNull()
        expect(calculateDrawVolume({ vialAmount: 5000, vialUnit: 'IU', waterMl: 2, doseAmount: 500, doseUnit: 'mcg' })).toBeNull()
    })

    // --- REVERSE MATH TESTS ---
    it('should reverse calculate 2ml water when vial is 10mg, dose is 500mcg, and draw is 10 units', () => {
        const result = calculateReverseWater({
            vialAmount: 10, vialUnit: 'mg',
            drawUnits: 10, doseAmount: 500, doseUnit: 'mcg'
        })
        expect(result).toBe(2)
    })

    // BLOCKS ATTACK 2: Explicitly tests the "mg" branch of the reverse calculator
    it('should reverse calculate 2ml water when vial is 10mg, dose is 1mg, and draw is 20 units', () => {
        const result = calculateReverseWater({
            vialAmount: 10, vialUnit: 'mg',
            drawUnits: 20, doseAmount: 1, doseUnit: 'mg'
        })
        expect(result).toBe(2)
    })

    it('should reverse calculate 1ml water when vial is 5000 IU, dose is 250 IU, and draw is 5 units', () => {
        const result = calculateReverseWater({
            vialAmount: 5000, vialUnit: 'IU',
            drawUnits: 5, doseAmount: 250, doseUnit: 'IU'
        })
        expect(result).toBe(1)
    })

    it('should return null for reverse calculation if units are dangerously mixed', () => {
        expect(calculateReverseWater({ vialAmount: 10, vialUnit: 'mg', drawUnits: 10, doseAmount: 250, doseUnit: 'IU' })).toBeNull()
    })
})