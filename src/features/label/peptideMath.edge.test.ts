import { describe, it, expect } from 'vitest'
import { resolveLabelMath } from './LabelMathResolver'
import { displayConcentration, displayDrawUnits } from './calculatorModeSwitch'
import type { LabelModelInput } from './labelModel'
import {
    isProtocolExceedsCompound,
    computeMeasuresPerVialRaw,
    formatMeasuresPerVialDisplay,
} from './calculatorGuards'
import {
    calculateDrawVolume,
    calculateReverseWater,
    calculateFromTargetConcentration,
    calculateDefaultDrawUnits,
    DRAW_UNITS_HIGH_THRESHOLD,
    formatDisplayNumber,
    formatDisplayNumberFixed,
    formatWaterAmountLabel,
    formatDrawUnitsLabel,
    formatConcentrationLabel,
    roundForDisplay,
} from './peptideMath'

describe('display rounding boundaries', () => {
    it('should round half-up at the third decimal', () => {
        expect(roundForDisplay(1.1655)).toBe(1.166)
        expect(roundForDisplay(1.1645)).toBe(1.165)
        expect(formatDisplayNumber(1.9996)).toBe('2')
        expect(formatDisplayNumber(0.0004)).toBe('0')
        expect(formatDisplayNumber(0.0005)).toBe('0.001')
        expect(formatDisplayNumberFixed(10 / 3)).toBe('3.333')
        expect(formatDisplayNumberFixed(2.3)).toBe('2.300')
    })

    it('should keep very large and very small display values stable', () => {
        expect(formatDisplayNumber(123456.7894)).toBe('123456.789')
        expect(formatDisplayNumber(0.001)).toBe('0.001')
        expect(formatConcentrationLabel(1 / 3, 'mg')).toBe('0.333mg per ml')
        expect(formatWaterAmountLabel(1e-12)).toBe('0')
    })
})

describe('forward / reverse round-trips with awkward decimals', () => {
    it('should round-trip reverse→forward without draw drift when water stays exact', () => {
        const cases = [
            { vial: 23.3, protocol: 10, unit: 'mg' as const, draw: 50 },
            { vial: 22, protocol: 4, unit: 'mg' as const, draw: 27 },
            { vial: 7.25, protocol: 0.125, unit: 'mg' as const, draw: 17 },
            { vial: 10, protocol: 333, unit: 'mcg' as const, draw: 11 },
            { vial: 5000, protocol: 137, unit: 'IU' as const, draw: 13 },
        ]

        for (const c of cases) {
            const unitWorld = c.unit === 'IU'
                ? { vialUnit: 'IU' as const, measureUnit: 'IU' as const }
                : { vialUnit: 'mg' as const, measureUnit: c.unit }
            const water = calculateReverseWater({
                compoundAmount: c.vial,
                unitWorld,
                drawUnits: c.draw,
                protocolAmount: c.protocol,
            })
            expect(water).not.toBeNull()

            const forward = calculateDrawVolume({
                compoundAmount: c.vial,
                unitWorld,
                waterMl: water!,
                protocolAmount: c.protocol,
            })
            expect(forward?.drawUnits).toBeCloseTo(c.draw, 10)
        }
    })

    it('should keep concentration clean when display-rounded water would poison math', () => {
        // Classic trap: 23.3 / 20 = 1.165; round water to 1.17 → conc ≈ 19.915
        const exactWater = calculateReverseWater({
            compoundAmount: 23.3,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            drawUnits: 50,
            protocolAmount: 10,
        })
        expect(exactWater).toBeCloseTo(1.165, 10)
        expect(formatWaterAmountLabel(exactWater!)).toBe('1.165')
        expect(formatConcentrationLabel(23.3 / exactWater!, 'mg')).toBe('20mg per ml')

        const poisoned = calculateDrawVolume({
            compoundAmount: 23.3,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            waterMl: roundForDisplay(1.17),
            protocolAmount: 10,
        })
        expect(poisoned?.concentrationMgPerMl).toBeCloseTo(23.3 / 1.17, 5)
        expect(poisoned?.concentrationMgPerMl).not.toBeCloseTo(20, 2)
    })

    it('should stay consistent under set-concentration solve with repeating decimals', () => {
        const solved = calculateFromTargetConcentration({
            compoundAmount: 10,
            unitWorld: { vialUnit: 'mg', measureUnit: 'mg' },
            targetConcentration: 7,
            protocolAmount: 1 / 3,
        })
        expect(solved).not.toBeNull()
        expect(solved!.waterMl).toBeCloseTo(10 / 7, 12)
        expect(solved!.drawUnits).toBeCloseTo(((1 / 3) / 7) * 100, 12)
        expect(formatWaterAmountLabel(solved!.waterMl)).toBe('1.429')
        expect(formatDrawUnitsLabel(solved!.drawUnits)).toBe('4.762 units')
        expect(solved!.concentrationMgPerMl).toBe(7)
    })
})

describe('default draw-unit boundaries', () => {
    it('should use 10 u/mg at and under the high threshold', () => {
        expect(DRAW_UNITS_HIGH_THRESHOLD).toBe(50)
        expect(calculateDefaultDrawUnits(5, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(50)
        expect(calculateDefaultDrawUnits(4.9, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(49)
        expect(calculateDefaultDrawUnits(500, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(5)
    })

    it('should drop to 5 u/mg only when 10× would exceed 50', () => {
        expect(calculateDefaultDrawUnits(5.1, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(25.5)
        expect(calculateDefaultDrawUnits(10, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(50)
        expect(calculateDefaultDrawUnits(6, { vialUnit: 'mg', measureUnit: 'mg' })).toBe(30)
    })

    it('should fall back to flat 10 when scaled mcg defaults would be below 1', () => {
        // Known disagreement: the IU branch above does NOT floor a sub-1-unit result
        // to a flat placeholder the way this mg branch does (see the IU case in the
        // next test) - tracked as an open, deliberate decision in docs/TECH-DEBT.md
        // ("mg/IU draw-units disagree below 1 unit") rather than fixed here, since
        // the fix changes calculateRecommendedDrawUnits' chosen value for a real
        // scenario and needs a product call on which end of the recommended water
        // range it should favor.
        expect(calculateDefaultDrawUnits(50, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(10)
        expect(calculateDefaultDrawUnits(99, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(10)
        expect(calculateDefaultDrawUnits(100, { vialUnit: 'mg', measureUnit: 'mcg' })).toBe(1)
    })

    it('should NOT floor a sub-1-unit IU result the same way the mg branch above does', () => {
        expect(calculateDefaultDrawUnits(0.05, { vialUnit: 'IU', measureUnit: 'IU' })).toBeCloseTo(0.5)
    })
})

describe('nonsense and invalid inputs', () => {
    // Mismatched unit worlds (e.g. mg vial / IU protocol unit) are unrepresentable
    // by construction now — see domain/units.test.ts "should reject an inconsistent
    // vial/measure pairing" for that regression coverage.
    it('should return null for zero and negative inputs', () => {
        expect(calculateDrawVolume({
            compoundAmount: -10, unitWorld: { vialUnit: 'mg', measureUnit: 'mg' }, waterMl: 2, protocolAmount: 1,
        })).toBeNull()
        expect(calculateDrawVolume({
            compoundAmount: 10, unitWorld: { vialUnit: 'mg', measureUnit: 'mg' }, waterMl: -2, protocolAmount: 1,
        })).toBeNull()
        expect(calculateDrawVolume({
            compoundAmount: 10, unitWorld: { vialUnit: 'mg', measureUnit: 'mg' }, waterMl: 2, protocolAmount: -1,
        })).toBeNull()
        expect(calculateFromTargetConcentration({
            compoundAmount: 10, unitWorld: { vialUnit: 'mg', measureUnit: 'mg' }, targetConcentration: -5, protocolAmount: 1,
        })).toBeNull()
        expect(calculateDefaultDrawUnits(-3, { vialUnit: 'mg', measureUnit: 'mg' })).toBeNull()
    })

    it('should not invent math from non-numeric label junk', () => {
        const result = resolveLabelMath({
            compoundAmount: 'n/a',
            vialUnit: 'mg',
            reconstitutionAmount: 'about two',
            protocolAmount: '???',
            measureUnit: 'mg',
            protocolUnits: 'lots',
            calculatorSolveMode: 'standard',
        })
        expect(result.autoUnits).toBe('')
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('')
    })

    it('should ignore junk draw text in set draw volume mode', () => {
        const result = resolveLabelMath({
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: 'nope units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.autoWater).toBe('')
        expect(result.autoConcentration).toBe('')
    })
})

describe('protocol vs vial boundaries', () => {
    it('should allow protocol equal to vial and compute one measure', () => {
        const input = {
            compoundAmount: '10',
            vialUnit: 'mg' as const,
            protocolAmount: '10',
            measureUnit: 'mg' as const,
        }
        expect(isProtocolExceedsCompound(input)).toBe(false)
        expect(computeMeasuresPerVialRaw(input)).toBe(1)
        expect(formatMeasuresPerVialDisplay(1)).toBe('1.000')
    })

    it('should block protocol just over the vial and allow just under', () => {
        expect(isProtocolExceedsCompound({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '10.0001',
            measureUnit: 'mg',
        })).toBe(true)
        expect(isProtocolExceedsCompound({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '9.9999',
            measureUnit: 'mg',
        })).toBe(false)
    })

    it('should treat mcg protocol that matches vial mg as equal, not exceeding', () => {
        expect(isProtocolExceedsCompound({
            compoundAmount: '2',
            vialUnit: 'mg',
            protocolAmount: '2000',
            measureUnit: 'mcg',
        })).toBe(false)
        expect(isProtocolExceedsCompound({
            compoundAmount: '2',
            vialUnit: 'mg',
            protocolAmount: '2001',
            measureUnit: 'mcg',
        })).toBe(true)
    })
})

describe('resolver extremes', () => {
    it('should handle tiny protocol amounts without crashing', () => {
        const result = resolveLabelMath({
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '0.001',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        })
        expect(result.autoConcentration).toBe('10mg per ml')
        expect(result.autoUnits).toBe('0.01 units')
    })

    it('should handle huge compound amounts with tiny target concentration', () => {
        const result = resolveLabelMath({
            compoundAmount: '1000',
            vialUnit: 'mg',
            protocolAmount: '5',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '0.25',
        })
        expect(result.autoWater).toBe('4000')
        expect(result.autoConcentration).toBe('0.25mg per ml')
        expect(result.autoUnits).toBe('2000 units')
    })

    it('should keep set-draw math stable with long fractional compound amounts', () => {
        const input: LabelModelInput = {
            compoundAmount: '12.345678',
            vialUnit: 'mg',
            protocolAmount: '1.2345678',
            measureUnit: 'mg',
            protocolUnits: '33 units',
            calculatorSolveMode: 'target_units',
        }
        const result = resolveLabelMath(input)
        // water = draw/100 * vial/protocol = 0.33 * 10 = 3.3 exact when ratio is 10
        expect(result.autoWater).toBe('3.3')
        expect(result.autoConcentration).toBe('3.741mg per ml')
        expect(displayDrawUnits('target_units', input, result)).toBe('33 units')
    })

    it('should derive exact 3× water for IU set-draw defaults', () => {
        const result = resolveLabelMath({
            compoundAmount: '4500',
            vialUnit: 'IU',
            protocolAmount: '150',
            measureUnit: 'IU',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.autoWater).toBe('3')
        expect(result.autoConcentration).toBe('1500IU per ml')
    })

    it('should not emit infinite concentration for near-zero water strings that fail parse', () => {
        const result = resolveLabelMath({
            compoundAmount: '10',
            vialUnit: 'mg',
            reconstitutionAmount: '0',
            protocolAmount: '1',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        })
        expect(result.autoConcentration).toBe('')
        expect(result.autoUnits).toBe('')
    })
})

describe('pathological strings and extreme ratios', () => {
    it('should parse leading number from messy numeric fields and ignore the rest', () => {
        const result = resolveLabelMath({
            compoundAmount: '20mg leftover',
            vialUnit: 'mg',
            reconstitutionAmount: '2.0ml BAC',
            protocolAmount: '2.5 please',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        })
        // compoundAmount uses parseFloat → 20; water uses parseFloat → 2; protocol → 2.5
        expect(result.autoConcentration).toBe('10mg per ml')
        expect(result.autoUnits).toBe('25 units')
    })

    it('should tolerate scientific-notation numeric strings via parseFloat', () => {
        const result = resolveLabelMath({
            compoundAmount: '1e1',
            vialUnit: 'mg',
            reconstitutionAmount: '2e0',
            protocolAmount: '5e-1',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        })
        expect(result.autoConcentration).toBe('5mg per ml')
        expect(result.autoUnits).toBe('10 units')
    })

    it('should still solve when protocol exceeds vial (guard is UI-only)', () => {
        expect(isProtocolExceedsCompound({
            compoundAmount: '5',
            vialUnit: 'mg',
            protocolAmount: '12',
            measureUnit: 'mg',
        })).toBe(true)

        const result = resolveLabelMath({
            compoundAmount: '5',
            vialUnit: 'mg',
            reconstitutionAmount: '1',
            protocolAmount: '12',
            measureUnit: 'mg',
            calculatorSolveMode: 'standard',
        })
        expect(result.autoConcentration).toBe('5mg per ml')
        expect(result.autoUnits).toBe('240 units')
        expect(computeMeasuresPerVialRaw({
            compoundAmount: '5',
            vialUnit: 'mg',
            protocolAmount: '12',
            measureUnit: 'mg',
        })).toBeCloseTo(5 / 12, 10)
    })

    it('should survive absurd syringe-scale draws without NaN labels', () => {
        const result = resolveLabelMath({
            compoundAmount: '1',
            vialUnit: 'mg',
            protocolAmount: '0.01',
            measureUnit: 'mg',
            protocolUnits: '9999 units',
            calculatorSolveMode: 'target_units',
        })
        // water = 9999 * 1mg / 0.01mg / 100 = 9999 ml; conc rounds to 0 at 3dp display
        expect(result.autoWater).toBe('9999')
        expect(result.autoConcentration).toBe('0mg per ml')
        expect(Number.isFinite(Number(result.autoWater))).toBe(true)
    })
})

describe('display must not feed back into assist solves', () => {
    it('should keep target concentration authoritative when water display rounds', () => {
        const input: LabelModelInput = {
            compoundAmount: '1',
            vialUnit: 'mg',
            protocolAmount: '0.1',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '3',
        }
        const result = resolveLabelMath(input)
        // Exact water 1/3; display 0.333 — back-calc would be ~3.003
        expect(result.autoWater).toBe('0.333')
        expect(result.autoConcentration).toBe('3mg per ml')
        expect(displayConcentration(input, result)).toBe('3mg per ml')
        expect(result.autoUnits).toBe('3.333 units')
    })

    it('should keep user draw units when reverse water has awkward decimals', () => {
        const input: LabelModelInput = {
            compoundAmount: '19.7',
            vialUnit: 'mg',
            protocolAmount: '3.3',
            measureUnit: 'mg',
            protocolUnits: '41 units',
            calculatorSolveMode: 'target_units',
        }
        const result = resolveLabelMath(input)
        const exactWater = (41 * 19.7) / (3.3 * 100)
        expect(result.autoWater).toBe(formatWaterAmountLabel(exactWater))
        expect(displayDrawUnits('target_units', input, result)).toBe('41 units')
        expect(result.autoConcentration).toBe(formatConcentrationLabel(19.7 / exactWater, 'mg'))
    })
})
