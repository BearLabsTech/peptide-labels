import { describe, it, expect } from 'vitest'
import { resolveLabelMath } from './LabelMathResolver'
import {
    isProtocolExceedsVial,
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
            const water = calculateReverseWater({
                vialAmount: c.vial,
                vialUnit: c.unit === 'IU' ? 'IU' : 'mg',
                drawUnits: c.draw,
                targetAmount: c.protocol,
                targetUnit: c.unit,
            })
            expect(water).not.toBeNull()

            const forward = calculateDrawVolume({
                vialAmount: c.vial,
                vialUnit: c.unit === 'IU' ? 'IU' : 'mg',
                waterMl: water!,
                targetAmount: c.protocol,
                targetUnit: c.unit,
            })
            expect(forward?.drawUnits).toBeCloseTo(c.draw, 10)
        }
    })

    it('should keep concentration clean when display-rounded water would poison math', () => {
        // Classic trap: 23.3 / 20 = 1.165; round water to 1.17 → conc ≈ 19.915
        const exactWater = calculateReverseWater({
            vialAmount: 23.3,
            vialUnit: 'mg',
            drawUnits: 50,
            targetAmount: 10,
            targetUnit: 'mg',
        })
        expect(exactWater).toBeCloseTo(1.165, 10)
        expect(formatWaterAmountLabel(exactWater!)).toBe('1.165')
        expect(formatConcentrationLabel(23.3 / exactWater!, 'mg')).toBe('20mg per ml')

        const poisoned = calculateDrawVolume({
            vialAmount: 23.3,
            vialUnit: 'mg',
            waterMl: roundForDisplay(1.17),
            targetAmount: 10,
            targetUnit: 'mg',
        })
        expect(poisoned?.concentrationMgPerMl).toBeCloseTo(23.3 / 1.17, 5)
        expect(poisoned?.concentrationMgPerMl).not.toBeCloseTo(20, 2)
    })

    it('should stay consistent under set-concentration solve with repeating decimals', () => {
        const solved = calculateFromTargetConcentration({
            vialAmount: 10,
            vialUnit: 'mg',
            targetConcentration: 7,
            targetAmount: 1 / 3,
            targetUnit: 'mg',
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
        expect(calculateDefaultDrawUnits(5, 'mg', 'mg')).toBe(50)
        expect(calculateDefaultDrawUnits(4.9, 'mg', 'mg')).toBe(49)
        expect(calculateDefaultDrawUnits(500, 'mcg', 'mg')).toBe(5)
    })

    it('should drop to 5 u/mg only when 10× would exceed 50', () => {
        expect(calculateDefaultDrawUnits(5.1, 'mg', 'mg')).toBe(25.5)
        expect(calculateDefaultDrawUnits(10, 'mg', 'mg')).toBe(50)
        expect(calculateDefaultDrawUnits(6, 'mg', 'mg')).toBe(30)
    })

    it('should fall back to flat 10 when scaled mcg defaults would be below 1', () => {
        expect(calculateDefaultDrawUnits(50, 'mcg', 'mg')).toBe(10)
        expect(calculateDefaultDrawUnits(99, 'mcg', 'mg')).toBe(10)
        expect(calculateDefaultDrawUnits(100, 'mcg', 'mg')).toBe(1)
    })
})

describe('nonsense and invalid inputs', () => {
    it('should return null for zero, negative, and mismatched unit worlds', () => {
        expect(calculateDrawVolume({
            vialAmount: -10, vialUnit: 'mg', waterMl: 2, targetAmount: 1, targetUnit: 'mg',
        })).toBeNull()
        expect(calculateDrawVolume({
            vialAmount: 10, vialUnit: 'mg', waterMl: -2, targetAmount: 1, targetUnit: 'mg',
        })).toBeNull()
        expect(calculateDrawVolume({
            vialAmount: 10, vialUnit: 'mg', waterMl: 2, targetAmount: -1, targetUnit: 'mg',
        })).toBeNull()
        expect(calculateDrawVolume({
            vialAmount: 10, vialUnit: 'mg', waterMl: 2, targetAmount: 250, targetUnit: 'IU',
        })).toBeNull()
        expect(calculateReverseWater({
            vialAmount: 10, vialUnit: 'IU', drawUnits: 10, targetAmount: 1, targetUnit: 'mg',
        })).toBeNull()
        expect(calculateFromTargetConcentration({
            vialAmount: 10, vialUnit: 'mg', targetConcentration: -5, targetAmount: 1, targetUnit: 'mg',
        })).toBeNull()
        expect(calculateDefaultDrawUnits(-3, 'mg', 'mg')).toBeNull()
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
        expect(isProtocolExceedsVial(input)).toBe(false)
        expect(computeMeasuresPerVialRaw(input)).toBe(1)
        expect(formatMeasuresPerVialDisplay(1)).toBe('1.000')
    })

    it('should block protocol just over the vial and allow just under', () => {
        expect(isProtocolExceedsVial({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '10.0001',
            measureUnit: 'mg',
        })).toBe(true)
        expect(isProtocolExceedsVial({
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '9.9999',
            measureUnit: 'mg',
        })).toBe(false)
    })

    it('should treat mcg protocol that matches vial mg as equal, not exceeding', () => {
        expect(isProtocolExceedsVial({
            compoundAmount: '2',
            vialUnit: 'mg',
            protocolAmount: '2000',
            measureUnit: 'mcg',
        })).toBe(false)
        expect(isProtocolExceedsVial({
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

    it('should handle huge vial amounts with tiny target concentration', () => {
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

    it('should keep set-draw math stable with long fractional vial amounts', () => {
        const result = resolveLabelMath({
            compoundAmount: '12.345678',
            vialUnit: 'mg',
            protocolAmount: '1.2345678',
            measureUnit: 'mg',
            protocolUnits: '33 units',
            calculatorSolveMode: 'target_units',
        })
        // water = draw/100 * vial/protocol = 0.33 * 10 = 3.3 exact when ratio is 10
        expect(result.autoWater).toBe('3.3')
        expect(result.autoConcentration).toBe('3.741mg per ml')
        expect(result.mergedInput.protocolUnits).toBe('33 units')
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
        expect(isProtocolExceedsVial({
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
        const result = resolveLabelMath({
            compoundAmount: '1',
            vialUnit: 'mg',
            protocolAmount: '0.1',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '3',
        })
        // Exact water 1/3; display 0.333 — back-calc would be ~3.003
        expect(result.autoWater).toBe('0.333')
        expect(result.autoConcentration).toBe('3mg per ml')
        expect(result.mergedInput.concentration).toBe('3mg per ml')
        expect(result.autoUnits).toBe('3.333 units')
    })

    it('should keep user draw units when reverse water has awkward decimals', () => {
        const result = resolveLabelMath({
            compoundAmount: '19.7',
            vialUnit: 'mg',
            protocolAmount: '3.3',
            measureUnit: 'mg',
            protocolUnits: '41 units',
            calculatorSolveMode: 'target_units',
        })
        const exactWater = (41 * 19.7) / (3.3 * 100)
        expect(result.autoWater).toBe(formatWaterAmountLabel(exactWater))
        expect(result.mergedInput.protocolUnits).toBe('41 units')
        expect(result.autoConcentration).toBe(formatConcentrationLabel(19.7 / exactWater, 'mg'))
    })
})
