import { describe, it, expect } from 'vitest'
import {
    calculateDrawVolume,
    calculateReverseWater,
    calculateFromTargetConcentration,
    calculateWaterFromTargetConcentration,
    calculateDrawVolumeFromTargetConcentration,
    calculateDefaultDrawUnits,
    calculateRecommendedDrawUnits,
    resolveDefaultDrawUnitsLabel,
    DEFAULT_TARGET_CONCENTRATION,
    DEFAULT_DRAW_UNITS_PER_MG,
    MIN_RECOMMENDED_WATER_ML,
    DISPLAY_DECIMALS,
    formatDisplayNumber,
    formatWaterAmountLabel,
    formatDrawUnitsLabel,
    formatConcentrationLabel,
    parseConcentrationValue,
    parseNumericField,
    resolveDefaultTargetConcentration,
} from './peptideMath'

describe('display-only rounding', () => {
    it('should use three decimal places for all display formatting', () => {
        expect(DISPLAY_DECIMALS).toBe(3)
        expect(formatDisplayNumber(1.1654)).toBe('1.165')
        expect(formatDisplayNumber(26.666666)).toBe('26.667')
        expect(formatDisplayNumber(20)).toBe('20')
        expect(formatWaterAmountLabel(22 / 15)).toBe('1.467')
        expect(formatDrawUnitsLabel((4 / 15) * 100)).toBe('26.667 units')
        expect(formatConcentrationLabel(23.3 / 1.165, 'mg')).toBe('20mg per ml')
    })
})

describe('parseNumericField', () => {
    it('should parse signed decimals, scientific notation, and supported trailing labels', () => {
        expect(parseNumericField('10 units')).toBe(10)
        expect(parseNumericField(' .5 ml')).toBe(0.5)
        expect(parseNumericField('-5')).toBe(-5)
        expect(parseNumericField('1e3')).toBe(1000)
        expect(parseNumericField('2.5e-2 units')).toBe(0.025)
    })

    it('should reject leading junk and malformed numeric syntax', () => {
        expect(parseNumericField('abc10')).toBe(0)
        expect(parseNumericField('1..2')).toBe(0)
        expect(parseNumericField('1e')).toBe(0)
        expect(parseNumericField('Infinity')).toBe(0)
        expect(parseNumericField('')).toBe(0)
    })
})

describe('calculateDrawVolume', () => {
    it('should compute draw units from vial, water, and mcg protocol amount', () => {
        const result = calculateDrawVolume({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            waterMl: 2,
            targetAmount: 500,
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
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            waterMl: 2,
            targetAmount: 2.5,
        })
        expect(result?.drawUnits).toBe(25)
        expect(result?.drawVolumeMl).toBe(0.25)
        expect(result?.concentrationMgPerMl).toBe(10)
    })

    it('should compute draw units for IU vials and IU protocol amounts', () => {
        const result = calculateDrawVolume({
            vialAmount: 5000,
            unitWorld: { vialUnit: 'IU', measureUnit: 'IU' },
            waterMl: 2,
            targetAmount: 250,
        })
        expect(result?.drawUnits).toBe(10)
        expect(result?.concentrationIuPerMl).toBe(2500)
        expect(result?.concentrationMgPerMl).toBeUndefined()
    })

    it('should return null when vial amount is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 0,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            waterMl: 2,
            targetAmount: 500,
        })).toBeNull()
    })

    it('should return null when water volume is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            waterMl: 0,
            targetAmount: 500,
        })).toBeNull()
    })

    it('should return null when protocol amount is missing or non-positive', () => {
        expect(calculateDrawVolume({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            waterMl: 2,
            targetAmount: -1,
        })).toBeNull()
    })

    // A mg vial paired with an IU protocol unit, or an IU vial paired with an
    // mcg protocol unit, is now unrepresentable: UnitWorld only admits
    // { vialUnit: 'mg', measureUnit: 'mg' | 'mcg' } or { vialUnit: 'IU', measureUnit: 'IU' }.
    // See domain/units.test.ts "should reject an inconsistent vial/measure pairing"
    // for the constructor-level regression coverage this replaces.
})

describe('calculateReverseWater', () => {
    it('should compute water volume from vial, draw units, and mcg protocol amount', () => {
        expect(calculateReverseWater({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            drawUnits: 10,
            targetAmount: 500,
        })).toBe(2)
    })

    it('should compute water volume when protocol amount is in mg', () => {
        expect(calculateReverseWater({
            vialAmount: 20,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            drawUnits: 25,
            targetAmount: 2.5,
        })).toBe(2)
    })

    it('should compute water volume for IU vials', () => {
        expect(calculateReverseWater({
            vialAmount: 5000,
            unitWorld: { vialUnit: 'IU', measureUnit: 'IU' },
            drawUnits: 10,
            targetAmount: 250,
        })).toBe(2)
    })

    it('should return null when draw units are missing or non-positive', () => {
        expect(calculateReverseWater({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            drawUnits: 0,
            targetAmount: 500,
        })).toBeNull()
    })

    // A mismatched unit world (e.g. mg vial / IU protocol unit) is unrepresentable
    // by construction — see domain/units.test.ts.
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
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 5,
            targetAmount: 500,
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
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            targetConcentration: 10,
            targetAmount: 2.5,
        })
        expect(result?.waterMl).toBe(2)
        expect(result?.drawUnits).toBe(25)
        expect(result?.concentrationMgPerMl).toBe(10)
    })

    it('should derive water and draw units for IU vials using IU per ml', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 5000,
            unitWorld: { vialUnit: 'IU', measureUnit: 'IU' },
            targetConcentration: 2500,
            targetAmount: 250,
        })
        expect(result?.waterMl).toBe(2)
        expect(result?.drawUnits).toBe(10)
        expect(result?.concentrationIuPerMl).toBe(2500)
    })

    it('should accept any positive target concentration', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 7,
            targetAmount: 500,
        })
        expect(result?.waterMl).toBeCloseTo(10 / 7, 10)
        expect(result?.drawUnits).toBeCloseTo((0.5 / 7) * 100, 10)
        expect(result?.concentrationMgPerMl).toBe(7)
        expect(formatWaterAmountLabel(result!.waterMl)).toBe('1.429')
        expect(formatDrawUnitsLabel(result!.drawUnits)).toBe('7.143 units')
    })

    it('should use target concentration for draw units without rounding water for math', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 22,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            targetConcentration: 15,
            targetAmount: 4,
        })
        expect(result?.waterMl).toBeCloseTo(22 / 15, 10)
        expect(result?.concentrationMgPerMl).toBe(15)
        expect(result?.drawUnits).toBeCloseTo((4 / 15) * 100, 10)
        expect(formatWaterAmountLabel(result!.waterMl)).toBe('1.467')
        expect(formatDrawUnitsLabel(result!.drawUnits)).toBe('26.667 units')
    })

    it('should keep exact water volume (display formats to three decimals separately)', () => {
        const result = calculateFromTargetConcentration({
            vialAmount: 15,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 10,
            targetAmount: 500,
        })
        expect(result?.waterMl).toBe(1.5)
        expect(result?.drawUnits).toBe(5)
        expect(formatWaterAmountLabel(result!.waterMl)).toBe('1.5')
    })

    it('should return null when required inputs are missing or invalid', () => {
        expect(calculateFromTargetConcentration({
            vialAmount: 0,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 10,
            targetAmount: 500,
        })).toBeNull()

        expect(calculateFromTargetConcentration({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 0,
            targetAmount: 500,
        })).toBeNull()

        expect(calculateFromTargetConcentration({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 10,
            targetAmount: 0,
        })).toBeNull()
    })

    // A mismatched unit world (e.g. mg vial / IU protocol unit) is unrepresentable
    // by construction — see domain/units.test.ts.

    it('should stay consistent with forward math after concentration solve', () => {
        const solved = calculateFromTargetConcentration({
            vialAmount: 30,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 15,
            targetAmount: 750,
        })
        expect(solved).not.toBeNull()
        expect(solved!.concentrationMgPerMl).toBe(15)

        const forward = calculateDrawVolume({
            vialAmount: 30,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            waterMl: solved!.waterMl,
            targetAmount: 750,
        })
        expect(forward?.drawUnits).toBe(solved!.drawUnits)
    })

    it('should stay consistent with reverse math when solved draw units are reused', () => {
        const solved = calculateFromTargetConcentration({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            targetConcentration: 5,
            targetAmount: 500,
        })
        expect(solved).not.toBeNull()

        const reverseWater = calculateReverseWater({
            vialAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mcg' },
            drawUnits: solved!.drawUnits,
            targetAmount: 500,
        })
        expect(reverseWater).toBe(solved!.waterMl)
    })
})

describe('calculateDrawVolumeFromTargetConcentration', () => {
    it('should derive draw volume directly from target concentration', () => {
        expect(calculateDrawVolumeFromTargetConcentration(
            4, 15, { vialUnit: 'mg', measureUnit: 'mg' },
        )).toBeCloseTo(4 / 15, 5)
        expect(calculateDrawVolumeFromTargetConcentration(
            500, 5, { vialUnit: 'mg', measureUnit: 'mcg' },
        )).toBeCloseTo(0.1, 5)
    })
})

describe('authoritative assist inputs', () => {
    // The set-concentration case (vial 22mg / target 15mg-per-ml / protocol 4mg) is
    // already covered above by "should use target concentration for draw units
    // without rounding water for math" — same input, same assertions, plus the
    // formatted-label checks. This block covers the set-draw-volume analogue only.
    it('should keep draw units when reverse water is exact (not display-rounded) in set draw volume math', () => {
        const waterMl = calculateReverseWater({
            vialAmount: 22,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            drawUnits: 27,
            targetAmount: 4,
        })
        expect(waterMl).toBeCloseTo(1.485, 10)
        expect(formatWaterAmountLabel(waterMl!)).toBe('1.485')

        const forward = calculateDrawVolume({
            vialAmount: 22,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            waterMl: waterMl!,
            targetAmount: 4,
        })
        expect(forward?.drawUnits).toBeCloseTo(27, 10)
    })
})

describe('calculateDefaultDrawUnits', () => {
    it('should default to 10 units per mg for mg protocol amounts', () => {
        expect(calculateDefaultDrawUnits(3, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(30)
    })

    it('should default to 10 units per mg for mcg protocol amounts', () => {
        expect(calculateDefaultDrawUnits(500, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(5)
    })

    it('should fall back to 10 units when the scaled default would round to zero', () => {
        expect(calculateDefaultDrawUnits(3, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(10)
    })

    it('should default to 10 units per IU for IU vials when that stays at or under 50', () => {
        expect(calculateDefaultDrawUnits(5, { vialUnit: 'IU', measureUnit: 'IU' })).toBe(50)
    })

    it('should use 5 units per mg when 10 units per mg would exceed 50', () => {
        expect(calculateDefaultDrawUnits(10, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(50)
        expect(calculateDefaultDrawUnits(5.2, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(26)
        expect(calculateDefaultDrawUnits(6, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(30)
        expect(calculateDefaultDrawUnits(4, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(40)
    })

    it('should use 5 units per IU when 10 units per IU would exceed 50', () => {
        expect(calculateDefaultDrawUnits(250, { vialUnit: 'IU', measureUnit: 'IU' })).toBe(1250)
    })

    it('should return null for invalid inputs', () => {
        expect(calculateDefaultDrawUnits(0, { vialUnit: 'mg', measureUnit: 'mg' })).toBeNull()
    })

    // A mismatched pairing (e.g. mcg measure / IU vial) is unrepresentable via
    // UnitWorld — see domain/units.test.ts "should reject an inconsistent
    // vial/measure pairing" for that regression coverage.

    it('should expose default target concentration as 10', () => {
        expect(DEFAULT_TARGET_CONCENTRATION).toBe(10)
        expect(DEFAULT_DRAW_UNITS_PER_MG).toBe(10)
    })
})

describe('calculateRecommendedDrawUnits', () => {
    it('should raise the system suggestion when the normal default implies less than 1 ml', () => {
        expect(MIN_RECOMMENDED_WATER_ML).toBe(1)
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 5)).toBe(20)
        expect(calculateRecommendedDrawUnits(1.25, { vialUnit: 'mg', measureUnit: 'mg' }, 7.5)).toBe(20)
        expect(calculateRecommendedDrawUnits(500, { vialUnit: 'mg', measureUnit: 'mcg' }, 5)).toBe(10)
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'IU', measureUnit: 'IU' }, 5)).toBe(20)
        expect(calculateRecommendedDrawUnits(4, { vialUnit: 'mg', measureUnit: 'mg' }, 6.3)).toBe(70)
    })

    it('should prioritize the 1 ml floor when it crosses the normal 50-unit policy', () => {
        expect(calculateDefaultDrawUnits(5.2, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(26)
        expect(calculateRecommendedDrawUnits(5.2, { vialUnit: 'mg', measureUnit: 'mg' }, 6)).toBe(90)
    })

    it('should choose the next quick pick so a generated recommendation stays above 1 ml', () => {
        const recommended = calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 6.0001)
        expect(recommended).toBe(20)

        const water = calculateReverseWater({
            vialAmount: 6.0001,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            drawUnits: recommended!,
            targetAmount: 1,
        })
        expect(water).toBeGreaterThanOrEqual(1)
    })

    it('should preserve the normal suggestion when it already implies at least 1 ml', () => {
        expect(calculateRecommendedDrawUnits(3, { vialUnit: 'mg', measureUnit: 'mg' }, 20)).toBe(30)
        expect(calculateRecommendedDrawUnits(5.2, { vialUnit: 'mg', measureUnit: 'mg' }, 20)).toBe(26)
        expect(calculateRecommendedDrawUnits(250, { vialUnit: 'IU', measureUnit: 'IU' }, 50)).toBe(1250)
    })

    it('should lower generated draw units when needed to fit selected vial capacity', () => {
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 100, 3)).toBe(3)
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 100, 5)).toBe(5)
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 100, 10)).toBe(10)
        expect(calculateRecommendedDrawUnits(4, { vialUnit: 'mg', measureUnit: 'mg' }, 36.3, 3)).toBe(30)

        const recommended = calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' }, 100, 3)!
        expect(calculateReverseWater({
            vialAmount: 100,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            drawUnits: recommended,
            targetAmount: 1,
        })).toBe(3)
    })

    it('should keep the old policy when vial amount is not known', () => {
        expect(calculateRecommendedDrawUnits(1, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(10)
        expect(calculateRecommendedDrawUnits(500, { vialUnit: 'mg', measureUnit: 'mcg' }, 0)).toBe(5)
    })

    // A mismatched pairing (e.g. mcg measure / IU vial) is unrepresentable via
    // UnitWorld — see domain/units.test.ts "should reject an inconsistent
    // vial/measure pairing" for that regression coverage.
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

    it('should recommend draw units that imply at least 1 ml once vial amount is known', () => {
        expect(resolveDefaultDrawUnitsLabel('1', 'mg', 'mg', '5')).toBe('20 units')
        expect(resolveDefaultDrawUnitsLabel('1.25', 'mg', 'mg', '7.5')).toBe('20 units')
        expect(resolveDefaultDrawUnitsLabel('500', 'mcg', 'mg', '5')).toBe('10 units')
    })

    it('should cap a generated draw recommendation to selected vial capacity', () => {
        expect(resolveDefaultDrawUnitsLabel('1', 'mg', 'mg', '100', 3)).toBe('3 units')
        expect(resolveDefaultDrawUnitsLabel('1', 'mg', 'mg', '100', 20)).toBe('10 units')
        expect(resolveDefaultDrawUnitsLabel('4', 'mg', 'mg', '36.3', 3)).toBe('30 units')
        expect(resolveDefaultDrawUnitsLabel('4', 'mg', 'mg', '6.3', 3)).toBe('70 units')
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

    it('should cap its fallback so the system recommendation implies at least 1 ml', () => {
        expect(resolveDefaultTargetConcentration({ compoundAmount: '5' })).toBe('5')
        expect(resolveDefaultTargetConcentration({ compoundAmount: '7.5' })).toBe('7.5')
        expect(resolveDefaultTargetConcentration({ compoundAmount: '20' })).toBe('10')
    })

    it('should raise its fallback so recommended water fits selected vial capacity', () => {
        expect(resolveDefaultTargetConcentration({ compoundAmount: '100' }, 3)).toBe('33.334')
        expect(resolveDefaultTargetConcentration({ compoundAmount: '100' }, 5)).toBe('20')
        expect(resolveDefaultTargetConcentration({ compoundAmount: '100' }, 10)).toBe('10')
    })

    it('should preserve existing user-selected values outside the recommended water range', () => {
        expect(resolveDefaultTargetConcentration({
            compoundAmount: '5',
            reconstitutionAmount: '0.5',
        })).toBe('10')
        expect(resolveDefaultTargetConcentration({
            concentration: '20mg per ml',
            compoundAmount: '5',
        })).toBe('20')
        expect(resolveDefaultTargetConcentration({
            compoundAmount: '20',
            reconstitutionAmount: '4',
        }, 3)).toBe('5')
    })
})
