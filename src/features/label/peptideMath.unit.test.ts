import { describe, it, expect } from 'vitest'
import {
    calculateDrawVolume,
    calculateReverseWater,
    calculateFromTargetConcentration,
    calculateWaterFromTargetConcentration,
    calculateDrawVolumeFromTargetConcentration,
    calculateDefaultDrawUnits,
    resolveDefaultDrawUnitsLabel,
    DEFAULT_TARGET_CONCENTRATION,
    DEFAULT_DRAW_UNITS_PER_MG,
    parseConcentrationValue,
    resolveDefaultTargetConcentration,
} from './peptideMath'

describe('calculateDrawVolume', () => {
    it('should compute draw units from vial, water, and mcg protocol amount', () => {
        const result = calculateDrawVolume({
            vialAmount: 10,
            vialUnit: 'mg',
            waterMl: 2,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(result).toEqual({
            drawUnits: 10,
            drawVolumeMl: 0.1,
            concentrationMgPerMl: 5,
            concentrationIuPerMl: undefined,
        })
    })

    it('should compute draw units when protocol amount is in mg', () => {
        const result = calculateDrawVolume({
            vialAmount: 20,
            vialUnit: 'mg',
            waterMl: 2,
            targetAmount: 2.5,
            targetUnit: 'mg',
        })
        expect(result?.drawUnits).toBe(25)
        expect(result?.drawVolumeMl).toBe(0.25)
        expect(result?.concentrationMgPerMl).toBe(10)
    })

    it('should compute draw units for IU vials and IU protocol amounts', () => {
        const result = calculateDrawVolume({
            vialAmount: 5000,
            vialUnit: 'IU',
            waterMl: 2,
            targetAmount: 250,
            targetUnit: 'IU',
        })
        expect(result?.drawUnits).toBe(10)
        expect(result?.concentrationIuPerMl).toBe(2500)
        expect(result?.concentrationMgPerMl).toBeUndefined()
    })

    it('should return null when vial amount is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 0,
            vialUnit: 'mg',
            waterMl: 2,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()
    })

    it('should return null when water volume is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 10,
            vialUnit: 'mg',
            waterMl: 0,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()
    })

    it('should return null when protocol amount is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 10,
            vialUnit: 'mg',
            waterMl: 2,
            targetAmount: -1,
            targetUnit: 'mcg',
        })).toBeNull()
    })

    it('should return null when mg vial is paired with IU protocol units', () => {
        expect(calculateDrawVolume({
            vialAmount: 10,
            vialUnit: 'mg',
            waterMl: 2,
            targetAmount: 250,
            targetUnit: 'IU',
        })).toBeNull()
    })

    it('should return null when IU vial is paired with mcg protocol units', () => {
        expect(calculateDrawVolume({
            vialAmount: 5000,
            vialUnit: 'IU',
            waterMl: 2,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()
    })
})

describe('calculateReverseWater', () => {
    it('should compute water volume from vial, draw units, and mcg protocol amount', () => {
        expect(calculateReverseWater({
            vialAmount: 10,
            vialUnit: 'mg',
            drawUnits: 10,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBe(2)
    })

    it('should compute water volume when protocol amount is in mg', () => {
        expect(calculateReverseWater({
            vialAmount: 20,
            vialUnit: 'mg',
            drawUnits: 25,
            targetAmount: 2.5,
            targetUnit: 'mg',
        })).toBe(2)
    })

    it('should compute water volume for IU vials', () => {
        expect(calculateReverseWater({
            vialAmount: 5000,
            vialUnit: 'IU',
            drawUnits: 10,
            targetAmount: 250,
            targetUnit: 'IU',
        })).toBe(2)
    })

    it('should return null when draw units are missing or non-positive', () => {
        expect(calculateReverseWater({
            vialAmount: 10,
            vialUnit: 'mg',
            drawUnits: 0,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()
    })

    it('should return null when unit worlds mismatch', () => {
        expect(calculateReverseWater({
            vialAmount: 10,
            vialUnit: 'mg',
            drawUnits: 10,
            targetAmount: 250,
            targetUnit: 'IU',
        })).toBeNull()
    })
})

describe('calculateWaterFromTargetConcentration', () => {
    it('should derive water volume from vial amount and target concentration', () => {
        expect(calculateWaterFromTargetConcentration(20, 10)).toBe(2)
        expect(calculateWaterFromTargetConcentration(21.5, 10)).toBe(2.15)
    })

    it('should return null for invalid inputs', () => {
        expect(calculateWaterFromTargetConcentration(0, 10)).toBeNull()
        expect(calculateWaterFromTargetConcentration(20, 0)).toBeNull()
    })
})

describe('calculateFromTargetConcentration', () => {
    it('should derive water and draw units from a round mg/ml target', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 5,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(result).toEqual({
            waterMl: 2,
            drawUnits: 10,
            drawVolumeMl: 0.1,
            concentrationMgPerMl: 5,
            concentrationIuPerMl: undefined,
        })
    })

    it('should derive water and draw units for a 10 mg/ml target with mg protocol amount', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 20,
            vialUnit: 'mg',
            targetConcentration: 10,
            targetAmount: 2.5,
            targetUnit: 'mg',
        })
        expect(result?.waterMl).toBe(2)
        expect(result?.drawUnits).toBe(25)
        expect(result?.concentrationMgPerMl).toBe(10)
    })

    it('should derive water and draw units for IU vials using IU per ml', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 5000,
            vialUnit: 'IU',
            targetConcentration: 2500,
            targetAmount: 250,
            targetUnit: 'IU',
        })
        expect(result?.waterMl).toBe(2)
        expect(result?.drawUnits).toBe(10)
        expect(result?.concentrationIuPerMl).toBe(2500)
    })

    it('should accept any positive target concentration', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 7,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(result?.waterMl).toBe(1.43)
        expect(result?.drawUnits).toBe(7.1)
        expect(result?.concentrationMgPerMl).toBe(7)
    })

    it('should use target concentration for draw units when water rounds', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 22,
            vialUnit: 'mg',
            targetConcentration: 15,
            targetAmount: 4,
            targetUnit: 'mg',
        })
        expect(result?.waterMl).toBe(1.47)
        expect(result?.concentrationMgPerMl).toBe(15)
        expect(result?.drawUnits).toBe(26.7)
    })

    it('should round water volume to two decimal places', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 15,
            vialUnit: 'mg',
            targetConcentration: 10,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(result?.waterMl).toBe(1.5)
        expect(result?.drawUnits).toBe(5)
    })

    it('should return null when required inputs are missing or invalid', () => {
        expect(calculateFromTargetConcentration({
            vialAmount: 0,
            vialUnit: 'mg',
            targetConcentration: 10,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()

        expect(calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 0,
            targetAmount: 500,
            targetUnit: 'mcg',
        })).toBeNull()

        expect(calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 10,
            targetAmount: 0,
            targetUnit: 'mcg',
        })).toBeNull()
    })

    it('should return null when unit worlds mismatch', () => {
        expect(calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 10,
            targetAmount: 250,
            targetUnit: 'IU',
        })).toBeNull()
    })

    it('should stay consistent with forward math after concentration solve', () => {
        const solved = calculateFromTargetConcentration({
            vialAmount: 30,
            vialUnit: 'mg',
            targetConcentration: 15,
            targetAmount: 750,
            targetUnit: 'mcg',
        })
        expect(solved).not.toBeNull()
        expect(solved!.concentrationMgPerMl).toBe(15)

        const forward = calculateDrawVolume({
            vialAmount: 30,
            vialUnit: 'mg',
            waterMl: solved!.waterMl,
            targetAmount: 750,
            targetUnit: 'mcg',
        })
        expect(forward?.drawUnits).toBe(solved!.drawUnits)
    })

    it('should stay consistent with reverse math when solved draw units are reused', () => {
        const solved = calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 5,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(solved).not.toBeNull()

        const reverseWater = calculateReverseWater({
            vialAmount: 10,
            vialUnit: 'mg',
            drawUnits: solved!.drawUnits,
            targetAmount: 500,
            targetUnit: 'mcg',
        })
        expect(reverseWater).toBe(solved!.waterMl)
    })
})

describe('calculateDrawVolumeFromTargetConcentration', () => {
    it('should derive draw volume directly from target concentration', () => {
        expect(calculateDrawVolumeFromTargetConcentration(4, 'mg', 15, 'mg')).toBeCloseTo(4 / 15, 5)
        expect(calculateDrawVolumeFromTargetConcentration(500, 'mcg', 5, 'mg')).toBeCloseTo(0.1, 5)
    })
})

describe('authoritative assist inputs', () => {
    it('should keep target concentration in set concentration solve results', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 22,
            vialUnit: 'mg',
            targetConcentration: 15,
            targetAmount: 4,
            targetUnit: 'mg',
        })
        expect(result?.concentrationMgPerMl).toBe(15)
        expect(result?.waterMl).toBe(1.47)
        expect(result?.drawUnits).toBe(26.7)
    })

    it('should keep draw units when reverse water rounds in set draw volume math', () => {
        const waterMl = calculateReverseWater({
            vialAmount: 22,
            vialUnit: 'mg',
            drawUnits: 27,
            targetAmount: 4,
            targetUnit: 'mg',
        })
        expect(waterMl).toBe(1.49)

        const forward = calculateDrawVolume({
            vialAmount: 22,
            vialUnit: 'mg',
            waterMl: waterMl!,
            targetAmount: 4,
            targetUnit: 'mg',
        })
        expect(forward?.drawUnits).toBe(27.1)
    })
})

describe('calculateDefaultDrawUnits', () => {
    it('should default to 10 units per mg for mg protocol amounts', () => {
        expect(calculateDefaultDrawUnits(3, 'mg', 'mg')).toBe(30)
    })

    it('should default to 10 units per mg for mcg protocol amounts', () => {
        expect(calculateDefaultDrawUnits(500, 'mcg', 'mg')).toBe(5)
    })

    it('should fall back to 10 units when the scaled default would round to zero', () => {
        expect(calculateDefaultDrawUnits(3, 'mcg', 'mg')).toBe(10)
    })

    it('should default to 10 units per IU for IU vials', () => {
        expect(calculateDefaultDrawUnits(250, 'IU', 'IU')).toBe(2500)
    })

    it('should return null for invalid or mismatched inputs', () => {
        expect(calculateDefaultDrawUnits(0, 'mg', 'mg')).toBeNull()
        expect(calculateDefaultDrawUnits(500, 'mcg', 'IU')).toBeNull()
        expect(calculateDefaultDrawUnits(250, 'IU', 'mg')).toBeNull()
    })

    it('should expose default target concentration as 10', () => {
        expect(DEFAULT_TARGET_CONCENTRATION).toBe(10)
        expect(DEFAULT_DRAW_UNITS_PER_MG).toBe(10)
    })
})

describe('resolveDefaultDrawUnitsLabel', () => {
    it('should return flat 10 units when vial amount is missing', () => {
        expect(resolveDefaultDrawUnitsLabel('5', 'mg', 'mg', '')).toBe('10 units')
        expect(resolveDefaultDrawUnitsLabel('5', 'mcg', 'mg', undefined)).toBe('10 units')
    })

    it('should scale from protocol amount once vial amount is known', () => {
        expect(resolveDefaultDrawUnitsLabel('5', 'mg', 'mg', '20')).toBe('50 units')
        expect(resolveDefaultDrawUnitsLabel('500', 'mcg', 'mg', '10')).toBe('5 units')
    })

    it('should return empty string when protocol amount is missing', () => {
        expect(resolveDefaultDrawUnitsLabel('', 'mg', 'mg', '20')).toBe('')
    })
})

describe('parseConcentrationValue', () => {
    it('should parse numeric concentration from label strings', () => {
        expect(parseConcentrationValue('20mg per ml')).toBe(20)
        expect(parseConcentrationValue('2500IU per ml')).toBe(2500)
    })

    it('should return null for empty or invalid values', () => {
        expect(parseConcentrationValue('')).toBeNull()
        expect(parseConcentrationValue(undefined)).toBeNull()
        expect(parseConcentrationValue('not a number')).toBeNull()
    })
})

describe('resolveDefaultTargetConcentration', () => {
    it('should derive target concentration from the concentration label string', () => {
        expect(resolveDefaultTargetConcentration({
            concentration: '20mg per ml',
            compoundAmount: '20',
            reconstitutionAmount: '2',
        })).toBe('20')
    })

    it('should derive target concentration from vial and water amounts', () => {
        expect(resolveDefaultTargetConcentration({
            compoundAmount: '20',
            reconstitutionAmount: '1',
        })).toBe('20')
    })

    it('should fall back to 10 when no concentration source exists', () => {
        expect(resolveDefaultTargetConcentration({})).toBe('10')
    })
})
