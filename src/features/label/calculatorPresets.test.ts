import { describe, expect, it } from 'vitest'
import {
    DRAW_UNITS_PRESETS,
    PROTOCOL_AMOUNT_PRESETS_IU,
    PROTOCOL_AMOUNT_PRESETS_MCG,
    PROTOCOL_AMOUNT_PRESETS_MG,
    VIAL_AMOUNT_PRESETS_IU,
    VIAL_AMOUNT_PRESETS_MG,
    drawUnitsPresets,
    isPresetSelected,
    protocolAmountPresets,
    vialAmountPresets,
} from './calculatorPresets'
import {
    nextDrawUnitQuickPick,
    previousDrawUnitQuickPick,
} from './drawUnitsPolicy'

describe('drawUnitsPresets', () => {
    it('should offer 5-unit steps through 50 and 10-unit steps through 100', () => {
        expect(DRAW_UNITS_PRESETS).toEqual([
            '5', '10', '15', '20', '25', '30', '35', '40', '45', '50',
            '60', '70', '80', '90', '100',
        ])
        expect(drawUnitsPresets(1)).toEqual(DRAW_UNITS_PRESETS)
    })

    it('should cap quick picks to the selected syringe capacity', () => {
        expect(drawUnitsPresets(0.5)).toEqual([
            '5', '10', '15', '20', '25', '30', '35', '40', '45', '50',
        ])
        expect(drawUnitsPresets(0.3)).toEqual([
            '5', '10', '15', '20', '25', '30',
        ])
    })

    it('should resolve predictable quick picks around recommendation boundaries', () => {
        expect(nextDrawUnitQuickPick(63.493)).toBe(70)
        expect(previousDrawUnitQuickPick(33.057)).toBe(30)
        expect(nextDrawUnitQuickPick(100.001)).toBeNull()
        expect(previousDrawUnitQuickPick(4.999)).toBeNull()
    })
})

describe('amount presets', () => {
    it('should select compound presets by compound unit', () => {
        expect(vialAmountPresets('mg')).toBe(VIAL_AMOUNT_PRESETS_MG)
        expect(vialAmountPresets(undefined)).toBe(VIAL_AMOUNT_PRESETS_MG)
        expect(vialAmountPresets('IU')).toBe(VIAL_AMOUNT_PRESETS_IU)
    })

    it('should keep protocol presets in the matching unit world', () => {
        expect(protocolAmountPresets('mg', 'mg')).toBe(PROTOCOL_AMOUNT_PRESETS_MG)
        expect(protocolAmountPresets('mcg', 'mg')).toBe(PROTOCOL_AMOUNT_PRESETS_MCG)
        expect(protocolAmountPresets('IU', 'IU')).toBe(PROTOCOL_AMOUNT_PRESETS_IU)
        expect(protocolAmountPresets('IU', 'mg')).toBe(PROTOCOL_AMOUNT_PRESETS_IU)
    })

    it('should compare numeric preset values without depending on suffix formatting', () => {
        expect(isPresetSelected('10 units', '10')).toBe(true)
        expect(isPresetSelected('10.5 ml', '10.5')).toBe(true)
        expect(isPresetSelected('', '10')).toBe(false)
        expect(isPresetSelected('5', '10')).toBe(false)
    })
})
